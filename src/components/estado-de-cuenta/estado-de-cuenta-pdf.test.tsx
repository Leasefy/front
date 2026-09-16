/**
 * El PDF del estado de cuenta, fijado sobre el ÁRBOL que devuelve el componente.
 *
 * No se renderiza el PDF de verdad: `pdf().toBlob()` vive en el navegador y
 * arrastra fontkit, yoga y un reconciler entero. Lo que sí se puede fijar sin
 * nada de eso —y es justo lo que se rompe— es la ESTRUCTURA: cuántas hojas
 * salen, qué números aparecen, qué columnas se pintan y cuáles no.
 *
 * Los componentes del documento son funciones puras (ningún hook), así que el
 * caminante de acá abajo los expande llamándolos. Es lo que haría el
 * reconciler, sin el reconciler.
 *
 * Los datos salen de `ejemplo-de-prueba.ts`, el mismo fixture que usan las
 * pruebas de la pantalla: si el papel y la pantalla no parten del mismo
 * documento, no hay prueba que garantice que dicen el mismo número.
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { formatCurrency } from '@/lib/format';
import {
  contrato,
  contratoConImpuestos,
  estadoDeCuenta,
  fila,
} from './ejemplo-de-prueba';
import {
  conceptoDeLaFila,
  EstadoDeCuentaPDF,
  medidasDeLaTabla,
  paraElPapel,
  tamanoDelHeroe,
  urlDeLogoUsable,
} from './estado-de-cuenta-pdf';

// ══ Caminante del árbol ═════════════════════════════════════════════════════

/** Recorre el árbol expandiendo los componentes y visita cada nodo nativo. */
function recorrer(nodo: ReactNode, visita: (el: ReactElement) => void): void {
  if (nodo === null || nodo === undefined || typeof nodo === 'boolean') return;
  if (Array.isArray(nodo)) {
    nodo.forEach((hijo) => recorrer(hijo as ReactNode, visita));
    return;
  }
  if (!isValidElement(nodo)) return;
  const el = nodo as ReactElement<{ children?: ReactNode }>;
  if (typeof el.type === 'function') {
    const fabrica = el.type as (props: unknown) => ReactNode;
    recorrer(fabrica(el.props), visita);
    return;
  }
  visita(el);
  recorrer(el.props?.children, visita);
}

/** Todas las cadenas del árbol, en orden. */
function textosDe(nodo: ReactNode): string[] {
  const salida: string[] = [];
  const recoger = (actual: ReactNode): void => {
    if (actual === null || actual === undefined || typeof actual === 'boolean') return;
    if (typeof actual === 'string' || typeof actual === 'number') {
      salida.push(String(actual));
      return;
    }
    if (Array.isArray(actual)) {
      actual.forEach((hijo) => recoger(hijo as ReactNode));
      return;
    }
    if (!isValidElement(actual)) return;
    const el = actual as ReactElement<{ children?: ReactNode }>;
    if (typeof el.type === 'function') {
      const fabrica = el.type as (props: unknown) => ReactNode;
      recoger(fabrica(el.props));
      return;
    }
    recoger(el.props?.children);
  };
  recoger(nodo);
  return salida;
}

/** El texto de una hoja, en un solo pedazo, para buscarle cosas adentro. */
function letraDe(nodo: ReactNode): string {
  return textosDe(nodo).join('\n');
}

function paginasDe(nodo: ReactNode): ReactElement[] {
  const hojas: ReactElement[] = [];
  recorrer(nodo, (el) => {
    if (el.type === 'PAGE') hojas.push(el);
  });
  return hojas;
}

function marcasDe(nodo: ReactNode): string[] {
  const marcas: string[] = [];
  recorrer(nodo, (el) => {
    const marca = (el.props as Record<string, unknown>)['data-testid'];
    if (typeof marca === 'string') marcas.push(marca);
  });
  return marcas;
}

function fuentesDe(nodo: ReactNode): string[] {
  const fuentes = new Set<string>();
  recorrer(nodo, (el) => {
    const style = (el.props as { style?: unknown }).style;
    for (const capa of Array.isArray(style) ? style : [style]) {
      const familia = (capa as { fontFamily?: unknown } | undefined)?.fontFamily;
      if (typeof familia === 'string') fuentes.add(familia);
    }
  });
  return [...fuentes].sort();
}

type PropsDePagina = {
  pageNumber: number;
  totalPages: number;
  subPageNumber: number;
  subPageTotalPages: number;
};

/** El `render` del pie, que es donde vive la numeración real de páginas. */
function numeradores(nodo: ReactNode): ((props: PropsDePagina) => ReactNode)[] {
  const encontrados: ((props: PropsDePagina) => ReactNode)[] = [];
  recorrer(nodo, (el) => {
    const render = (el.props as { render?: unknown }).render;
    if (typeof render === 'function') {
      encontrados.push(render as (props: PropsDePagina) => ReactNode);
    }
  });
  return encontrados;
}

// ══ El documento de ejemplo ═════════════════════════════════════════════════

const DOCUMENTO = estadoDeCuenta();
const SIN_IMPUESTOS = contrato();
const CON_IMPUESTOS = contratoConImpuestos();
const HOY = '2026-09-13';

describe('EstadoDeCuentaPDF', () => {
  const arbol = EstadoDeCuentaPDF({ doc: DOCUMENTO, hoy: HOY });
  const hojas = paginasDe(arbol);

  it('saca una hoja por contrato más la portada, todas A4 horizontal', () => {
    expect(hojas).toHaveLength(1 + DOCUMENTO.contratos.length);
    expect(marcasDe(hojas[0])).toContain('portada');
    expect(marcasDe(hojas[1])).toContain(`contrato-${SIN_IMPUESTOS.numero}`);
    expect(marcasDe(hojas[2])).toContain(`contrato-${CON_IMPUESTOS.numero}`);
    for (const hoja of hojas) {
      expect(hoja.props).toMatchObject({ size: 'A4', orientation: 'landscape' });
    }
  });

  it('la portada lleva el número insignia y el resumen del cliente', () => {
    const portada = letraDe(hojas[0]);
    expect(portada).toContain('Resta por pagar');
    expect(portada).toContain(formatCurrency(DOCUMENTO.totales.restaPorPagar));
    expect(portada).toContain('Total en todos sus contratos');
    expect(portada).toContain(formatCurrency(DOCUMENTO.totales.cancelado));
    expect(portada).toContain('J Y C PAPAS S.A.S');
    expect(portada).toContain('Inquilino');
    expect(portada).toContain('PORTOFINO PROPIEDAD RAIZ S.A.S');
    expect(portada).toContain('NIT 901548190');
    expect(portada).toContain('Caldas, 13 sep 2026');
    // La cuota vencida se cuenta en singular: «1 cuotas vencidas» en la
    // portada del documento insignia, no.
    expect(portada).toContain('1 cuota vencida');
    expect(portada).not.toContain('1 cuotas vencidas');
  });

  it('la portada resume cada contrato como una tabla de amortización', () => {
    const portada = letraDe(hojas[0]);
    expect(marcasDe(hojas[0])).toEqual(
      expect.arrayContaining([
        'resta-por-pagar',
        `amortizacion-${SIN_IMPUESTOS.numero}`,
        `amortizacion-${CON_IMPUESTOS.numero}`,
      ]),
    );
    // Cuatro cuotas de arriendo: una cancelada acá y una del sistema viejo.
    expect(portada).toContain('1 de 4 cuotas');
    expect(portada).toContain('1 del sistema anterior');
    expect(portada).toContain(formatCurrency(SIN_IMPUESTOS.totales.restaPorPagar));
  });

  it('la nota de filtros sólo aparece cuando viene, y en la portada', () => {
    const filtrado = 'Los totales son de lo que estás viendo, no de todo el contrato.';
    expect(letraDe(arbol)).not.toContain(filtrado);
    const conNota = paginasDe(
      EstadoDeCuentaPDF({ doc: DOCUMENTO, hoy: HOY, nota: filtrado }),
    );
    expect(letraDe(conNota[0])).toContain(filtrado);
    expect(letraDe(conNota[1])).not.toContain(filtrado);
  });

  it('🔴 el papel rotula los dos números: «Contrato 1298 · Leasefy #1839»; un nativo va como «Contrato #14»', () => {
    const hojasConNumero = paginasDe(
      EstadoDeCuentaPDF({
        doc: estadoDeCuenta({
          contratos: [
            contrato({ numeroDeLeasefy: 1839 }),
            contrato({ id: 'ct-14', numero: '14', numeroDeLeasefy: 14 }),
          ],
        }),
        hoy: HOY,
      }),
    );
    expect(letraDe(hojasConNumero[1])).toContain('Contrato 1298 · Leasefy #1839');
    expect(letraDe(hojasConNumero[2])).toContain('Contrato #14');
    expect(letraDe(hojasConNumero[2])).not.toContain('Leasefy #14');
  });

  it('cada contrato trae su encabezado, sus dos secciones y sus totales', () => {
    const hoja = letraDe(hojas[1]);
    expect(hoja).toContain(`Contrato ${SIN_IMPUESTOS.numero}`);
    expect(hoja).toContain(
      'Inquilino del inmueble en CL 129 SUR 56 53 LC 01 MEZANINE',
    );
    expect(hoja).toContain('Vigente');
    expect(hoja).toContain('Arriendos');
    expect(hoja).toContain('Otros conceptos');
    expect(hoja).toContain('Este contrato no tiene otros conceptos.');
    expect(hoja).toContain(`Totales del contrato ${SIN_IMPUESTOS.numero}`);
    expect(hoja).toContain(formatCurrency(SIN_IMPUESTOS.totales.cancelado));
    expect(hoja).toContain(formatCurrency(SIN_IMPUESTOS.totales.restaPorPagar));
    expect(marcasDe(hojas[1])).toContain(`total-contrato-${SIN_IMPUESTOS.numero}`);

    // El contrato terminado lo dice, y trae sus otros conceptos.
    expect(letraDe(hojas[2])).toContain('Terminado');
    expect(letraDe(hojas[2])).toContain('Papelería');
  });

  it('la fila que quedó partida por un abono se lee como saldo, una sola vez', () => {
    const hoja = letraDe(hojas[1]);
    expect(hoja).toContain(
      'Saldo pendiente por Canon De Arrendamiento Personas Naturales',
    );
    expect(hoja).toContain(formatCurrency(299_098));
    expect(hoja).not.toContain('Saldo pendiente · Saldo pendiente');
    // La parte que sí entró conserva su comprobante: sin él, el saldo no se
    // podría rastrear hasta un ingreso.
    expect(hoja).toContain('28518 · INGRESO');
    expect(hoja).toContain('Sin pago');
    // Y la cuota que gestionó el sistema viejo se dice con esas palabras.
    expect(hoja).toContain('Sistema anterior');
  });

  it('el período se lee una vez, debajo del concepto y con raya imprimible', () => {
    const hoja = letraDe(hojas[1]);
    expect(hoja).toContain('21 jun 2026 – 20 jul 2026');
    // La flecha de la pantalla no existe en las fuentes internas de react-pdf:
    // saldría como un apóstrofo suelto en cada renglón.
    expect(hoja).not.toContain('→');
  });

  it('el punto de quiebre sale fechado, dentro de la tabla', () => {
    expect(marcasDe(hojas[1])).toContain('quiebre-2024-03-01');
    const hoja = letraDe(hojas[1]);
    expect(hoja).toContain('Venta del inmueble · 1 mar 2024');
    expect(hoja).toContain(
      'de CONSTRUCTORA ALEJANDRIA Y ASOCIADOS S.A.S a INVERSIONES EL PORTAL S.A.S',
    );
    // Y sólo en el contrato que lo tuvo.
    expect(marcasDe(hojas[2]).filter((m) => m.startsWith('quiebre-'))).toHaveLength(0);
  });

  it('un contrato sin IVA ni retenciones no gasta esas columnas', () => {
    const sinIva = marcasDe(hojas[1]);
    expect(sinIva).toContain('col-concepto');
    expect(sinIva).toContain('col-neto');
    expect(sinIva).not.toContain('col-iva');
    expect(sinIva).not.toContain('col-retencion');
    expect(sinIva).not.toContain('col-reteIva');
    expect(sinIva).not.toContain('col-reteIca');
    // Omitir en silencio sí sería esconder un dato: el pie del contrato lo dice.
    expect(letraDe(hojas[1])).toContain(
      'No se muestran IVA, Retención, ReteIVA, ReteICA',
    );

    // El que sí los tiene los pinta, y sólo nombra los que le faltan.
    const conIva = marcasDe(hojas[2]);
    expect(conIva).toContain('col-iva');
    expect(conIva).toContain('col-retencion');
    expect(letraDe(hojas[2])).toContain('No se muestran ReteIVA, ReteICA');
  });

  it('el pie numera con las páginas reales y firma quién es quién', () => {
    const pie = letraDe(hojas[1]);
    expect(pie).toContain('J Y C PAPAS S.A.S  ·  PORTOFINO PROPIEDAD RAIZ S.A.S');
    expect(pie).toContain('Generado por Leasefy el 13 sep 2026');

    const render = numeradores(hojas[1]);
    expect(render.length).toBeGreaterThan(0);
    expect(
      render[0]!({
        pageNumber: 2,
        totalPages: 3,
        subPageNumber: 1,
        subPageTotalPages: 1,
      }),
    ).toBe('Página 2 de 3');
  });

  it('sólo usa las fuentes que trae react-pdf', () => {
    // Registrar una fuente por URL ataría el documento a la red: un PDF que a
    // veces no sale no es un PDF. Que esta prueba se ponga roja es la señal.
    expect(fuentesDe(arbol)).toEqual(['Courier', 'Helvetica', 'Helvetica-Bold']);
  });

  it('aguanta un cliente sin contratos y una inmobiliaria sin datos', () => {
    const hojasVacias = paginasDe(
      EstadoDeCuentaPDF({
        doc: estadoDeCuenta({
          contratos: [],
          totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
          inmobiliaria: {
            razonSocial: 'PORTOFINO PROPIEDAD RAIZ S.A.S',
            nit: null,
            matricula: null,
            telefono: null,
            ciudad: null,
            logoUrl: null,
          },
        }),
        hoy: HOY,
      }),
    );
    expect(hojasVacias).toHaveLength(1);
    const letra = letraDe(hojasVacias[0]);
    expect(letra).toContain('Este cliente no tiene contratos');
    expect(letra).toContain('Inmobiliaria sin datos de contacto cargados');
    // Sin ciudad queda la fecha sola, no «undefined, 13 sep 2026».
    expect(letra).toContain('13 sep 2026');
    expect(letra).not.toContain('undefined');
    expect(letra).toContain('Al día');
  });
});

describe('medidas de la tabla', () => {
  it('las columnas suman siempre el ancho útil de la hoja', () => {
    for (let impuestos = 0; impuestos <= 9; impuestos += 1) {
      const m = medidasDeLaTabla(impuestos);
      const suma =
        m.concepto +
        m.estado +
        m.fechaDePago +
        m.bruto +
        m.impuesto * impuestos +
        m.neto +
        m.vence +
        m.documento;
      expect(suma).toBe(785);
      expect(m.concepto).toBeGreaterThanOrEqual(96);
      expect(m.documento).toBeGreaterThanOrEqual(66);
    }
  });

  it('aprieta la letra sólo cuando hay muchas columnas', () => {
    expect(medidasDeLaTabla(0).fuente).toBe(7.5);
    expect(medidasDeLaTabla(4).fuente).toBe(7);
    expect(medidasDeLaTabla(9).fuente).toBe(5.5);
  });
});

describe('el número insignia', () => {
  it('baja de tamaño antes que partirse en dos renglones', () => {
    expect(tamanoDelHeroe(formatCurrency(66_500_940))).toBe(30);
    expect(tamanoDelHeroe(formatCurrency(1_234_567_890_123))).toBeLessThan(30);
    expect(tamanoDelHeroe(formatCurrency(1_234_567_890_123))).toBeGreaterThanOrEqual(22);
  });
});

describe('lo que las fuentes internas no dibujan', () => {
  it('cambia la flecha por la raya de los rangos', () => {
    expect(paraElPapel('21 jun 2026 → 20 jul 2026')).toBe('21 jun 2026 – 20 jul 2026');
    expect(paraElPapel('a • b')).toBe('a · b');
    // Las tildes y la ñ sí existen en WinAnsi: no se tocan.
    expect(paraElPapel('Administración · Peñalosa')).toBe('Administración · Peñalosa');
  });
});

describe('el concepto de la fila', () => {
  it('no repite «Saldo pendiente» cuando el concepto ya lo dice', () => {
    const saldo = fila({
      concepto:
        'Saldo pendiente por Canon De Arrendamiento Personas Naturales. De 21-Jun-2026 hasta 20-Jul-2026',
      estado: 'PENDIENTE',
      parcial: true,
    });
    expect(conceptoDeLaFila(saldo)).toBe(
      'Saldo pendiente por Canon De Arrendamiento Personas Naturales',
    );
  });

  it('lo pone cuando el concepto no lo trae', () => {
    const saldo = fila({ concepto: 'Cuota de administración', estado: 'PENDIENTE', parcial: true });
    expect(conceptoDeLaFila(saldo)).toBe('Saldo pendiente · Cuota de administración');
  });

  it('no lo pone en una fila que no es un saldo', () => {
    expect(conceptoDeLaFila(fila({ concepto: 'Papelería', periodoDesde: null, periodoHasta: null }))).toBe(
      'Papelería',
    );
  });
});

describe('el logo de la inmobiliaria', () => {
  it('sólo se intenta con una URL absoluta o un data:', () => {
    expect(urlDeLogoUsable('https://cdn.leasefy.co/logo.png')).toBe(
      'https://cdn.leasefy.co/logo.png',
    );
    expect(urlDeLogoUsable('data:image/png;base64,iVBOR')).toBe(
      'data:image/png;base64,iVBOR',
    );
    // Una ruta relativa no significa nada dentro de un PDF.
    expect(urlDeLogoUsable('/uploads/logo.png')).toBeNull();
    expect(urlDeLogoUsable(null)).toBeNull();
    expect(urlDeLogoUsable('')).toBeNull();
  });
});
