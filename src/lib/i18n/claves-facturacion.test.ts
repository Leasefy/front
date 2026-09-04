/**
 * Guardia de las claves de Facturación.
 *
 * Hermano de `claves-recibos.test.ts` y compañía, y acá hizo falta de verdad:
 * la pantalla arma sus claves por concatenación (`queSon_${tab}`,
 * `desc_${tab}`, y una columna por pestaña), y `t()` devuelve la clave cruda
 * cuando no la encuentra. Una clave que falta no explota: pinta
 * «Todavía no tenés inmobiliaria.facturacion.queSon_ventas» en la cara del
 * usuario. El test de la página no lo ve porque mockea `t` para que devuelva
 * la clave — así que el diccionario se verifica acá, contra los dos idiomas.
 *
 * La lista está escrita a mano a propósito: derivarla del propio diccionario
 * haría que el test se compare contra sí mismo y pase en verde con una clave
 * borrada.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';
import type { FacturacionTab } from '@/lib/api/facturacion.types';

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

const ES = leer(es, 'inmobiliaria.facturacion');
const EN = leer(en, 'inmobiliaria.facturacion');

/** Las cuatro pestañas del contrato de tipos, no de un boceto. */
const TABS: readonly FacturacionTab[] = ['ventas', 'compras', 'electronica', 'notas'];

/** Las columnas que pinta cada pestaña, en el mismo orden que la página. */
const COLUMNAS: Record<FacturacionTab, readonly string[]> = {
  ventas: [
    'colNumero',
    'colTercero',
    'colConcepto',
    'colFecha',
    'colSubtotal',
    'colIva',
    'colTotal',
    'colPago',
    'colDian',
  ],
  compras: ['colNumero', 'colProveedor', 'colConcepto', 'colFecha', 'colTotal', 'colVence', 'colPago'],
  electronica: ['colTipo', 'colNumero', 'colCufe', 'colTercero', 'colFecha', 'colTotal', 'colDian'],
  notas: ['colTipo', 'colNumero', 'colFacturaRef', 'colMotivo', 'colValor', 'colFecha', 'colDian'],
};

const CLAVES_EN_USO = [
  'label',
  'title',
  'subtitle',
  'm2BannerTitle',
  'm2BannerDesc',
  ...TABS.map((t) => `tab_${t}`),
  // El vacío de cada pestaña: `queSon_*` arma el título («Todavía no tenés
  // facturas de venta») y `desc_*` es la descripción.
  ...TABS.map((t) => `queSon_${t}`),
  ...TABS.map((t) => `desc_${t}`),
  ...new Set(TABS.flatMap((t) => COLUMNAS[t])),
];

describe('las claves que usa Facturación existen en los dos diccionarios', () => {
  it.each(CLAVES_EN_USO)('%s', (ruta) => {
    expect(leer(ES, ruta), `falta en es.json: inmobiliaria.facturacion.${ruta}`).toBeTypeOf('string');
    expect(leer(EN, ruta), `falta en en.json: inmobiliaria.facturacion.${ruta}`).toBeTypeOf('string');
  });
});

describe('el encabezado no se repite', () => {
  it('el rótulo de sección no es el mismo texto que el título', () => {
    // Nico: no repetir información. `label` es la sección del panel
    // («Finanzas»); `title` es la pantalla («Facturación»).
    for (const [nombre, dic] of [
      ['es', ES],
      ['en', EN],
    ] as const) {
      expect(leer(dic, 'label'), `${nombre}: el rótulo repite el título`).not.toBe(
        leer(dic, 'title'),
      );
    }
  });
});

describe('el vacío se lee como una frase', () => {
  it.each(TABS)('queSon_%s va en plural y en minúscula', (tab) => {
    // `SinDatos` lo mete en «Todavía no tenés {queSon}»: si viene en mayúscula
    // o en singular, la frase queda mal escrita en pantalla.
    const texto = leer(ES, `queSon_${tab}`) as string;
    expect(texto[0]).toBe(texto[0]?.toLowerCase());
    // El plural lo lleva el sustantivo, no la frase: «facturas de venta».
    expect(texto.split(' ')[0].endsWith('s')).toBe(true);
  });
});
