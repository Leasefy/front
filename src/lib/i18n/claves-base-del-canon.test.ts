/**
 * Guardia de las claves del rótulo del canon (causado / recaudado).
 *
 * Hermano de `claves-cartera.test.ts`: una clave que sólo exista en `es.json`
 * sale en pantalla como `inmobiliaria.tesoreria.fCanonCausado` para quien use la
 * app en inglés. Y como la regla es que con base CAUSADO no se diga «recaudado»,
 * se fija también que el texto en español de las claves causadas no lo diga.
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

/** Lo que consumen `ExtractoPropietario` y Liquidaciones. Escrito a mano a propósito. */
const EXTRACTO = 'inmobiliaria.propietario.extracto';
const TESORERIA = 'inmobiliaria.tesoreria';
const CLAVES = [
  `${EXTRACTO}.thCanonCausado`,
  `${EXTRACTO}.thCollected`,
  `${EXTRACTO}.thCanon`,
  `${EXTRACTO}.canonCausado`,
  `${EXTRACTO}.canonRecaudado`,
  `${EXTRACTO}.canonMixto`,
  `${EXTRACTO}.queEsCanonCausado`,
  `${EXTRACTO}.queEsCanonRecaudado`,
  `${EXTRACTO}.filaCausado`,
  `${EXTRACTO}.filaRecaudado`,
  `${TESORERIA}.fCanonCausado`,
  `${TESORERIA}.fCanonRecaudado`,
  `${TESORERIA}.fCanonQueEsCausado`,
  `${TESORERIA}.fCanonQueEsRecaudado`,
  `${TESORERIA}.emptyDesc`,
  `${TESORERIA}.emptyDescRecaudado`,
];

/** Las que se muestran con base CAUSADO: ninguna puede decir «recaudado» ni «recibido». */
const DE_LA_BASE_CAUSADA = [
  `${EXTRACTO}.thCanonCausado`,
  `${EXTRACTO}.canonCausado`,
  `${EXTRACTO}.queEsCanonCausado`,
  `${TESORERIA}.fCanonCausado`,
  `${TESORERIA}.fCanonQueEsCausado`,
  `${TESORERIA}.emptyDesc`,
];

describe('claves del rótulo del canon', () => {
  it.each(CLAVES)('%s existe, con texto, en español y en inglés', (clave) => {
    expect(typeof leer(es, clave)).toBe('string');
    expect(typeof leer(en, clave)).toBe('string');
    expect((leer(es, clave) as string).trim()).not.toBe('');
    expect((leer(en, clave) as string).trim()).not.toBe('');
  });

  it.each(DE_LA_BASE_CAUSADA)('🔴 %s no dice «recaudado» ni «recibido»', (clave) => {
    expect(leer(es, clave)).not.toMatch(/recaud|recibid/i);
    expect(leer(en, clave)).not.toMatch(/collected|received/i);
  });

  it('«Canon recibido» ya no existe en Liquidaciones', () => {
    expect(leer(es, `${TESORERIA}.fCanon`)).toBeUndefined();
    expect(leer(en, `${TESORERIA}.fCanon`)).toBeUndefined();
  });
});
