/**
 * Guardia de las claves de la tasa de recaudo.
 *
 * El rótulo es lo que impide que dos números distintos se comparen con el mismo
 * nombre: si `rotulo.EMITIDO` sólo existiera en español, la pantalla en inglés
 * pintaría su ruta, y si `{{rotulo}}` faltara en una traducción, el Resumen
 * volvería a decir «2,2 %» sin decir de qué.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

function marcadores(texto: string): string[] {
  return [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

const T = 'inmobiliaria.tasaDeRecaudo';
const BASES = ['CAUSADO', 'EMITIDO'] as const;

/** Lo que consumen `lib/tasa-de-recaudo.ts`, `ConfigTasaDeRecaudo` y las pantallas. Escrito a mano a propósito. */
const CLAVES = [
  ...BASES.flatMap((b) => [
    `${T}.rotulo.${b}`,
    `${T}.cifras.${b}`,
    `${T}.sinMedir.${b}`,
    `${T}.ajuste.opcion.${b}.titulo`,
    `${T}.ajuste.opcion.${b}.explicacion`,
    `${T}.ajuste.opcion.${b}.ejemplo`,
  ]),
  `${T}.generico`,
  `${T}.ajuste.titulo`,
  `${T}.ajuste.intro`,
  `${T}.ajuste.porDefecto`,
  `${T}.ajuste.enUso`,
  `${T}.ajuste.conTusNumeros`,
  `${T}.ajuste.cargando`,
  `${T}.ajuste.errorNumeros`,
  `${T}.ajuste.noDisponible`,
  `${T}.ajuste.soloAdmin`,
  'inmobiliaria.dashboard.kpi.collectionRateLabel',
  'inmobiliaria.reportes.rentabilidad.stats.collectionRate',
];

describe('claves de la tasa de recaudo', () => {
  it.each(CLAVES)('«%s» existe en español y en inglés, con los mismos marcadores', (clave) => {
    const enEs = leer(es, clave);
    const enEn = leer(en, clave);
    expect(typeof enEs).toBe('string');
    expect(typeof enEn).toBe('string');
    expect(marcadores(enEn as string)).toEqual(marcadores(enEs as string));
  });

  it('los dos rótulos son distintos en cada idioma: no pueden volver a compartir nombre', () => {
    for (const dic of [es, en]) {
      expect(leer(dic, `${T}.rotulo.CAUSADO`)).not.toBe(leer(dic, `${T}.rotulo.EMITIDO`));
    }
  });

  it('el Resumen y la rentabilidad dicen con qué fórmula se midió', () => {
    expect(marcadores(leer(es, 'inmobiliaria.dashboard.kpi.collectionRateLabel') as string)).toContain('rotulo');
    expect(marcadores(leer(es, 'inmobiliaria.reportes.rentabilidad.stats.collectionRate') as string)).toContain(
      'rotulo',
    );
  });
});
