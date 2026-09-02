import { describe, it, expect } from 'vitest';
import {
  faltantesParaElBack,
  recalcularEstado,
  escribirCampo,
  resolveImportListingType,
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

  it.each([
    ['propertyAddress', { propertyAddress: '' }],
    ['propertyZone', { propertyZone: '' }],
    ['monthlyRent', { monthlyRent: undefined }],
    ['bathrooms', { bathrooms: undefined }],
    ['propertyArea', { propertyArea: undefined }],
  ] as const)('reclama %s cuando falta', (campo, parcial) => {
    const faltan = faltantesParaElBack(inmueble(parcial));
    expect(faltan.map((f) => f.campo)).toContain(campo);
  });

  it('un cero NO cuenta como dato: el back rechaza baños 0 y área 0', () => {
    const faltan = faltantesParaElBack(inmueble({ bathrooms: 0, propertyArea: 0 }));
    expect(faltan.map((f) => f.campo)).toEqual(
      expect.arrayContaining(['bathrooms', 'propertyArea']),
    );
  });

  it('respeta los mínimos exactos del DTO', () => {
    expect(faltantesParaElBack(inmueble({ monthlyRent: MINIMO_CANON }))).toEqual([]);
    expect(faltantesParaElBack(inmueble({ monthlyRent: MINIMO_CANON - 1 }))).toHaveLength(1);
    expect(faltantesParaElBack(inmueble({ propertyArea: MINIMO_AREA }))).toEqual([]);
    expect(faltantesParaElBack(inmueble({ propertyArea: MINIMO_AREA - 1 }))).toHaveLength(1);
  });

  it('cada faltante trae con qué completarlo', () => {
    const [f] = faltantesParaElBack(inmueble({ propertyArea: undefined }));
    // Sin etiqueta ni ayuda el campo no se puede dibujar: es lo que se muestra.
    expect(f.etiqueta).toBe('Área');
    expect(f.ayuda).toContain('10');
    expect(f.sufijo).toBe('m²');
    expect(f.tipo).toBe('numero');
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

  it('respects the CreatePropertyDto minimum for salePrice (contract.md §3.2.3, @Min(1_000_000))', () => {
    expect(faltantesParaElBack(inmuebleEnVenta({ salePrice: MINIMO_VENTA }))).toEqual([]);
    expect(faltantesParaElBack(inmuebleEnVenta({ salePrice: MINIMO_VENTA - 1 }))).toHaveLength(1);
  });

  it('a RENT row (default/unset listingType) is unaffected — still requires monthlyRent (regression)', () => {
    const faltan = faltantesParaElBack(inmueble({ monthlyRent: undefined }));
    expect(faltan.map((f) => f.campo)).toContain('monthlyRent');
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
    const sinArea = recalcularEstado(inmueble({ propertyArea: undefined }));
    expect(sinArea.hasErrors).toBe(true);
    expect(sinArea.selected).toBe(false);

    const completo = recalcularEstado({ ...sinArea, propertyArea: 35 });
    expect(completo.hasErrors).toBe(false);
    expect(completo.selected).toBe(true);
  });

  it('el mensaje dice qué falta y con qué regla', () => {
    const { errorMessages } = recalcularEstado(inmueble({ bathrooms: 0 }));
    expect(errorMessages[0]).toContain('baños');
    expect(errorMessages[0]).toContain('1');
  });
});

describe('escribirCampo', () => {
  it('vaciar un numérico lo deja en undefined, NO en cero', () => {
    // Cero es un dato («no tiene baños»); vacío es «no sé». Guardar 0 haría
    // que el inmueble se viera completo con un dato que nadie dio.
    const p = escribirCampo(inmueble(), 'bathrooms', '');
    expect(p.bathrooms).toBeUndefined();
    expect(p.hasErrors).toBe(true);
  });

  it('acepta el canon con puntos y símbolos, como se escribe de verdad', () => {
    expect(escribirCampo(inmueble(), 'monthlyRent', '$ 1.850.000').monthlyRent).toBe(1_850_000);
  });

  it('escribir el área que faltaba desbloquea el inmueble', () => {
    const bloqueado = recalcularEstado(inmueble({ propertyArea: undefined }));
    expect(bloqueado.hasErrors).toBe(true);

    const arreglado = escribirCampo(bloqueado, 'propertyArea', '48');
    expect(arreglado.propertyArea).toBe(48);
    expect(arreglado.hasErrors).toBe(false);
    expect(arreglado.selected).toBe(true);
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
