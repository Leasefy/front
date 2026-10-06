import { describe, it, expect } from 'vitest';
import {
  faltantesParaElBack,
  tipoEfectivo,
  recalcularEstado,
  escribirCampo,
  resolveImportListingType,
  requisitoDe,
  avisosDeValor,
  sinCanon,
  MINIMO_CANON,
  MINIMO_AREA,
  MINIMO_VENTA,
} from './requisitosDelBack';
import type { ImportProperty } from './importTypes';

function inmueble(parcial: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    propertyAddress: 'Calle 39A # 25-14',
    propertyCity: 'Bogotá',
    propertyZone: 'Teusaquillo',
    monthlyRent: 1_900_000,
    bathrooms: 1,
    propertyArea: 35,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...parcial,
  };
}

describe('faltantesParaElBack', () => {
  it('un inmueble completo no debe nada', () => {
    expect(faltantesParaElBack(inmueble())).toEqual([]);
  });

  it('reclama la dirección cuando falta', () => {
    const faltan = faltantesParaElBack(inmueble({ propertyAddress: '' }));
    expect(faltan.map((f) => f.campo)).toContain('propertyAddress');
  });

  /**
   * 🔴 T-0129 (`34570618`, 01-10-2026): el CANON dejó de frenar. Un arriendo
   * sin canon se crea igual y queda «con el canon por confirmar»: no se
   * publica, no se consigna ni se le hacen contratos hasta que alguien lo
   * ponga a mano. El back lo crea con `canonPorConfirmar`
   * (`importacion-inmuebles.service.ts`). Esta prueba seguía pidiendo el canon
   * como faltante y fallaba desde ese commit.
   */
  it('🔴 un arriendo sin canon NO frena: se crea con el canon por confirmar', () => {
    const p = inmueble({ monthlyRent: undefined });
    expect(faltantesParaElBack(p)).toEqual([]);
    expect(sinCanon(p)).toBe(true);
  });

  /**
   * 🔴 Nico, 2026-09-09, con el archivo real de una inmobiliaria en pantalla:
   * «nosotros tenemos cosas obligatorias que las inmobiliarias tienen como
   * opciones —el área, los baños— y ellos muchas veces no traen esto».
   *
   * Las tres columnas son nullables en la base desde
   * `20260909180000_inmueble_datos_que_pueden_faltar`, así que ausente ya no
   * es inválido: se guarda NULL, que es lo que sabemos.
   */
  it.each([
    ['el barrio', { propertyZone: '' }],
    ['los baños', { bathrooms: undefined }],
    ['el área', { propertyArea: undefined }],
    ['los tres juntos', { propertyZone: '', bathrooms: undefined, propertyArea: undefined }],
  ] as const)('🔴 sin %s el inmueble se crea igual', (_caso, parcial) => {
    expect(faltantesParaElBack(inmueble(parcial))).toEqual([]);
  });

  it('lo que SÍ sigue frenando es la dirección (y, en una venta, su precio)', () => {
    // Sin dirección no hay inmueble que identificar. El canon de un arriendo
    // ya no frena (T-0129): sin él, la fila entra «por confirmar».
    expect(
      faltantesParaElBack(inmueble({ propertyAddress: '', monthlyRent: undefined })).map(
        (f) => f.campo,
      ),
    ).toEqual(['propertyAddress']);
    expect(
      faltantesParaElBack(
        inmueble({ propertyAddress: '', listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
      ).map((f) => f.campo),
    ).toEqual(['propertyAddress', 'salePrice']);
  });

  it('un canon por debajo del mínimo del DTO no frena, pero cuenta como «por confirmar»', () => {
    // El mínimo sigue siendo el del DTO: por debajo no es un canon, es un dato
    // que falta. Desde T-0129 eso no deselecciona la fila: la marca.
    expect(sinCanon(inmueble({ monthlyRent: MINIMO_CANON }))).toBe(false);
    expect(sinCanon(inmueble({ monthlyRent: MINIMO_CANON - 1 }))).toBe(true);
    expect(faltantesParaElBack(inmueble({ monthlyRent: MINIMO_CANON - 1 }))).toEqual([]);
  });

  it('cada faltante trae con qué completarlo', () => {
    const [f] = faltantesParaElBack(
      inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
    );
    // Sin etiqueta ni ayuda el campo no se puede dibujar: es lo que se muestra.
    expect(f.etiqueta).toBe('Precio de venta');
    expect(f.ayuda).toContain(MINIMO_VENTA.toLocaleString('es-CO'));
    expect(f.sufijo).toBe('COP');
    expect(f.tipo).toBe('numero');
  });

  it('el canon se sigue describiendo, y dice que vacío queda por confirmar', () => {
    // Lo usa el input del canon cuando la persona SÍ lo quiere escribir.
    const canon = requisitoDe('monthlyRent');
    expect(canon.etiqueta).toBe('Canon mensual');
    expect(canon.ayuda).toContain(MINIMO_CANON.toLocaleString('es-CO'));
    expect(canon.ayuda).toContain('canon por confirmar');
  });
});

/**
 * Opcional no es «da igual lo que escribas».
 *
 * Un área en 0 tecleada por error saldría en el catálogo afirmando que el
 * inmueble no mide nada. Pero tampoco puede frenar la fila —ya está el dato,
 * sólo está mal—, así que se avisa y la persona decide.
 */
describe('avisosDeValor', () => {
  it('vacío nunca avisa: es el caso normal desde hoy', () => {
    expect(
      avisosDeValor(inmueble({ propertyArea: undefined, bathrooms: undefined })),
    ).toEqual([]);
  });

  it('un área en 0 avisa, pero no frena', () => {
    const p = inmueble({ propertyArea: 0 });
    expect(avisosDeValor(p)).toHaveLength(1);
    expect(avisosDeValor(p)[0]).toContain('0 m²');
    // Lo importante: sigue siendo creable.
    expect(faltantesParaElBack(p)).toEqual([]);
  });

  it('cero baños NO avisa: un lote o un depósito puede no tener ninguno', () => {
    expect(avisosDeValor(inmueble({ bathrooms: 0 }))).toEqual([]);
  });

  it('un negativo sí, en cualquiera de los tres', () => {
    expect(avisosDeValor(inmueble({ bathrooms: -1 }))).toHaveLength(1);
    expect(avisosDeValor(inmueble({ bedrooms: -2 }))).toHaveLength(1);
  });
});

// ── T-0038 §3.2/§3.8 — SALE rows require salePrice, not monthlyRent ────────

describe('resolveImportListingType — free-text CSV values (C13: origin governs validation)', () => {
  it.each([
    [undefined, 'rent'],
    ['', 'rent'],
    ['Arriendo', 'rent'],
    ['arriendo', 'rent'],
    ['Rent', 'rent'],
    ['Venta', 'sale'],
    ['venta', 'sale'],
    ['En venta', 'sale'],
    ['Sale', 'sale'],
    ['For sale', 'sale'],
  ])('%s -> %s', (raw, expected) => {
    expect(resolveImportListingType(raw)).toBe(expected);
  });

  it('an unrecognised value degrades to rent, matching the wire default (contract.md §3.2.2)', () => {
    expect(resolveImportListingType('¿Quién sabe?')).toBe('rent');
  });
});

describe('faltantesParaElBack — a SALE row needs salePrice, never monthlyRent', () => {
  function inmuebleEnVenta(parcial: Partial<ImportProperty> = {}): ImportProperty {
    return inmueble({
      listingType: 'Venta',
      monthlyRent: undefined,
      salePrice: 350_000_000,
      ...parcial,
    });
  }

  it('a complete SALE row (with salePrice, no monthlyRent) owes nothing', () => {
    expect(faltantesParaElBack(inmuebleEnVenta())).toEqual([]);
  });

  it('a SALE row missing salePrice is flagged on salePrice, never on monthlyRent', () => {
    const faltan = faltantesParaElBack(inmuebleEnVenta({ salePrice: undefined }));
    expect(faltan.map((f) => f.campo)).toContain('salePrice');
    expect(faltan.map((f) => f.campo)).not.toContain('monthlyRent');
  });

  it('respeta el mínimo de salePrice de CreatePropertyDto (@Min, hoy $1.000)', () => {
    expect(faltantesParaElBack(inmuebleEnVenta({ salePrice: MINIMO_VENTA }))).toEqual([]);
    expect(faltantesParaElBack(inmuebleEnVenta({ salePrice: MINIMO_VENTA - 1 }))).toHaveLength(1);
  });

  it('a RENT row (default/unset listingType) never asks for salePrice — without canon it is «por confirmar» (T-0129)', () => {
    const p = inmueble({ monthlyRent: undefined });
    expect(faltantesParaElBack(p).map((f) => f.campo)).not.toContain('salePrice');
    expect(sinCanon(p)).toBe(true);
  });
});

describe('recalcularEstado', () => {
  it('NO toca las sugerencias — ahí vive lo que la persona ya decidió', () => {
    // `analyzeProperties` las reconstruye desde cero; por eso no sirve acá.
    const p = inmueble({
      suggestions: [
        {
          field: 'commissionPercent',
          suggestedValue: '10',
          confidence: 'alta',
          reasoning: 'Estándar del mercado.',
          accepted: true,
        },
      ],
    });
    expect(recalcularEstado(p).suggestions).toEqual(p.suggestions);
  });

  it('deselecciona lo que no se puede crear y vuelve a seleccionarlo al completarlo', () => {
    const sinDireccion = recalcularEstado(inmueble({ propertyAddress: '' }));
    expect(sinDireccion.hasErrors).toBe(true);
    expect(sinDireccion.selected).toBe(false);

    const completo = recalcularEstado({ ...sinDireccion, propertyAddress: 'Calle 39A # 25-14' });
    expect(completo.hasErrors).toBe(false);
    expect(completo.selected).toBe(true);
  });

  it('🔴 T-0129: un arriendo sin canon nace seleccionado y sin error', () => {
    const p = recalcularEstado(inmueble({ monthlyRent: undefined }));
    expect(p.hasErrors).toBe(false);
    expect(p.errorMessages).toEqual([]);
    expect(p.selected).toBe(true);
  });

  it('🔴 un inmueble sin área NI baños NI barrio nace seleccionado', () => {
    // Es el caso del archivo real de Nico: dirección, ciudad y canon, nada
    // más. Antes nacía deseleccionado y con dos errores rojos.
    const p = recalcularEstado(
      inmueble({ propertyZone: '', bathrooms: undefined, propertyArea: undefined }),
    );
    expect(p.hasErrors).toBe(false);
    expect(p.errorMessages).toEqual([]);
    expect(p.selected).toBe(true);
  });

  it('el mensaje dice qué falta y con qué regla', () => {
    const { errorMessages } = recalcularEstado(
      inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
    );
    expect(errorMessages[0]).toContain('precio de venta');
    expect(errorMessages[0]).toContain(MINIMO_VENTA.toLocaleString('es-CO'));
  });
});

describe('escribirCampo', () => {
  it('vaciar un numérico lo deja en undefined, NO en cero', () => {
    // Cero es un dato («no tiene baños»); vacío es «no sé». Guardar 0 haría
    // que el inmueble se viera completo con un dato que nadie dio.
    const p = escribirCampo(inmueble(), 'bathrooms', '');
    expect(p.bathrooms).toBeUndefined();
    // Y desde el 2026-09-09 vaciarlo NO rompe nada: «no sé» es válido.
    expect(p.hasErrors).toBe(false);
  });

  it('acepta el canon con puntos y símbolos, como se escribe de verdad', () => {
    expect(escribirCampo(inmueble(), 'monthlyRent', '$ 1.850.000').monthlyRent).toBe(1_850_000);
  });

  it('escribir el precio de venta que faltaba desbloquea el inmueble', () => {
    const bloqueado = recalcularEstado(
      inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
    );
    expect(bloqueado.hasErrors).toBe(true);

    const arreglado = escribirCampo(bloqueado, 'salePrice', '350.000.000');
    expect(arreglado.salePrice).toBe(350_000_000);
    expect(arreglado.hasErrors).toBe(false);
    expect(arreglado.selected).toBe(true);
  });

  it('escribir el canon que faltaba le quita el «por confirmar»', () => {
    const porConfirmar = recalcularEstado(inmueble({ monthlyRent: undefined }));
    expect(sinCanon(porConfirmar)).toBe(true);

    const conCanon = escribirCampo(porConfirmar, 'monthlyRent', '1.900.000');
    expect(conCanon.monthlyRent).toBe(1_900_000);
    expect(sinCanon(conCanon)).toBe(false);
    expect(conCanon.selected).toBe(true);
  });

  it('el área se sigue pudiendo escribir aunque ya no sea obligatoria', () => {
    // Opcional no quiere decir que desaparezca del formulario: quien SÍ tiene
    // el dato tiene que poder cargarlo.
    expect(escribirCampo(inmueble(), 'propertyArea', '48').propertyArea).toBe(48);
  });

  it('un texto se guarda tal cual', () => {
    expect(escribirCampo(inmueble(), 'propertyZone', 'Teusaquillo').propertyZone).toBe('Teusaquillo');
  });

  it('corregir la dirección a mano apaga la marca de aproximada (T-0034 WU-1)', () => {
    // La marca existe para que la persona sepa que hay que revisar el dato.
    // Una vez que lo escribió, dejarla prendida sería decir que sigue siendo
    // una aproximación cuando ya no lo es.
    const aproximada = inmueble({ propertyAddress: 'Itagüí', direccionAproximada: true });
    const corregida = escribirCampo(aproximada, 'propertyAddress', 'Calle 39A # 25-14');
    expect(corregida.propertyAddress).toBe('Calle 39A # 25-14');
    expect(corregida.direccionAproximada).toBe(false);
  });

  it('escribir otro campo no toca la marca de dirección aproximada', () => {
    const aproximada = inmueble({ propertyAddress: 'Itagüí', direccionAproximada: true });
    expect(escribirCampo(aproximada, 'propertyZone', 'Centro').direccionAproximada).toBe(true);
  });
});

describe('escribirCampo — el input de reparación entiende los mismos formatos que el archivo (auditoría 2026-09-01)', () => {
  it('«65,5» de área tipeada a mano es 65,5 — no 655', () => {
    const p = escribirCampo(inmueble(), 'propertyArea', '65,5');
    expect(p.propertyArea).toBe(65.5);
  });

  it("«1'850.000» con apóstrofo de miles entra entero", () => {
    expect(escribirCampo(inmueble(), 'monthlyRent', "1'850.000").monthlyRent).toBe(1_850_000);
  });

  it('un texto que no es número queda vacío, nunca un número inventado', () => {
    expect(escribirCampo(inmueble(), 'monthlyRent', 'tres millones').monthlyRent).toBeUndefined();
  });
});

describe('requisitoDe', () => {
  it('describe un campo aunque ya esté completo — lo necesita el input que se queda', () => {
    const r = requisitoDe('propertyZone');
    expect(r.campo).toBe('propertyZone');
    expect(r.etiqueta).toBe('Barrio');
    // El texto dice que se puede dejar vacío: pedirlo sin decirlo es cómo
    // alguien inventa un barrio.
    expect(r.ayuda).toContain('Opcional');
    expect(requisitoDe('monthlyRent').sufijo).toBe('COP');
  });

  it('faltantesParaElBack devuelve exactamente lo que dice el catálogo', () => {
    const faltan = faltantesParaElBack(
      inmueble({ propertyAddress: '', listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
    );
    expect(faltan).toEqual([requisitoDe('propertyAddress'), requisitoDe('salePrice')]);
  });
});

/**
 * `tipoEfectivo` — la categoría del archivo manda, salvo que su precio no esté.
 *
 * Los casos salen del archivo real de la inmobiliaria (2.895 filas): cuatro
 * «Venta» que sólo traen canon, dos «Venta y Arriendo» igual, y dos «Arriendo»
 * que sólo traen precio de venta. Diez filas que se frenaban pidiéndoles
 * exactamente el número que no tienen.
 */
describe('tipoEfectivo — el tipo sigue al precio que sí existe', () => {
  it('la categoría manda cuando su precio está', () => {
    expect(tipoEfectivo(inmueble({ listingType: 'Arriendo', monthlyRent: 1_900_000 }))).toBe('rent');
    expect(
      tipoEfectivo(
        inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: 350_000_000 }),
      ),
    ).toBe('sale');
  });

  it('«Venta» que sólo trae canon se crea como arriendo, y ya no le falta nada', () => {
    const fila = inmueble({
      listingType: 'Venta',
      monthlyRent: 1_900_000,
      salePrice: undefined,
    });
    expect(tipoEfectivo(fila)).toBe('rent');
    expect(faltantesParaElBack(fila)).toEqual([]);
  });

  it('«Arriendo» que sólo trae precio de venta se crea como venta', () => {
    const fila = inmueble({
      listingType: 'Arriendo',
      monthlyRent: undefined,
      salePrice: 240_000_000,
    });
    expect(tipoEfectivo(fila)).toBe('sale');
    expect(faltantesParaElBack(fila)).toEqual([]);
  });

  it('«Venta y Arriendo» con los dos precios NO cambia: la categoría manda', () => {
    expect(
      tipoEfectivo(
        inmueble({
          listingType: 'Venta y Arriendo',
          monthlyRent: 1_900_000,
          salePrice: 350_000_000,
        }),
      ),
    ).toBe('sale');
  });

  it('sin ningún precio no inventa: devuelve lo declarado', () => {
    // Un arriendo sin precio entra con el canon POR CONFIRMAR (T-0129): no se
    // inventa un canon ni se lo convierte en venta.
    const arriendoSinNada = inmueble({
      listingType: 'Arriendo',
      monthlyRent: undefined,
      salePrice: undefined,
    });
    expect(tipoEfectivo(arriendoSinNada)).toBe('rent');
    expect(faltantesParaElBack(arriendoSinNada)).toEqual([]);
    expect(sinCanon(arriendoSinNada)).toBe(true);

    // Una venta sin precio sí sigue incompleta: el precio de venta frena.
    const ventaSinNada = inmueble({
      listingType: 'Venta',
      monthlyRent: undefined,
      salePrice: undefined,
    });
    expect(tipoEfectivo(ventaSinNada)).toBe('sale');
    expect(faltantesParaElBack(ventaSinNada).map((f) => f.campo)).toEqual(['salePrice']);
  });

  it('un precio por DEBAJO del mínimo no cuenta como precio', () => {
    const fila = inmueble({
      listingType: 'Venta',
      monthlyRent: MINIMO_CANON - 1,
      salePrice: undefined,
    });
    expect(tipoEfectivo(fila)).toBe('sale');
    expect(faltantesParaElBack(fila).map((f) => f.campo)).toEqual(['salePrice']);
  });
});

describe('el mínimo del canon dejó de frenar inmuebles reales', () => {
  it('una celda de parqueadero a $60.000/mes se puede crear', () => {
    expect(faltantesParaElBack(inmueble({ monthlyRent: 60_000 }))).toEqual([]);
  });

  it('pero un canon en 0 sigue siendo un dato que falta, no un arriendo gratis', () => {
    // No frena (T-0129), pero tampoco se toma como canon: queda por confirmar.
    const cero = inmueble({ monthlyRent: 0 });
    expect(sinCanon(cero)).toBe(true);
    expect(faltantesParaElBack(cero)).toEqual([]);
  });
});
