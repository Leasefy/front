/**
 * 🔴 GUARDIÁN: NINGUNA CLAVE DE TRADUCCIÓN LLEGA A LA PANTALLA SIN TEXTO.
 *
 * ── Qué pasa cuando falta una clave ────────────────────────────────────────
 *
 * `t()` devuelve LA CLAVE. No lanza, no avisa en rojo, no deja hueco: pinta
 * «inmobiliaria.config.toasts.error» donde iba el mensaje, y sigue.
 *
 * ── Lo que apareció el 22-09 ───────────────────────────────────────────────
 *
 * Tres claves que sí llegaban a la pantalla, y las tres con el mismo disfraz:
 *
 *     t('inmobiliaria.config.toasts.error') || 'Error al guardar permisos'
 *
 * Ese `||` NUNCA corre. `t()` de una clave que falta devuelve la clave, y una
 * clave es un texto con contenido: el `||` sólo caería con `''`. Quien lo
 * escribió creía tener un respaldo y lo que tenía era un aviso que decía
 * «inmobiliaria.config.toasts.error» cuando fallaba guardar los permisos.
 *
 * El respaldo que SÍ funciona es el de `CuentaDeCobro.tsx`: envolver `t` y
 * comparar contra la clave (`if (delPanel !== k) return delPanel`).
 *
 * ── Por qué no lo veía nada ────────────────────────────────────────────────
 *
 * El barrido del navegador sólo ve lo que se pinta: esas tres viven en un
 * toast de error, en una lista vacía y detrás de un plan. Y las pruebas del
 * componente doblan `t` para que devuelva la clave, así que del lado de la
 * prueba «clave» y «texto» son lo mismo. Esto se lee del código, no de la
 * pantalla, y por eso cubre las 4.899 claves y no sólo las que se visitaron.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import es from './locales/es.json';
import en from './locales/en.json';

const RAIZ = 'src';

const esPrueba = (p: string) =>
  /\.test\.tsx?$|\.spec\.tsx?$|__tests__|\/tests\//.test(p);

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const hoja = (o: unknown, ruta: string): unknown =>
  ruta
    .split('.')
    .reduce<unknown>(
      (a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined),
      o,
    );

/** Cada `t('a.b.c')` literal del producto, con el archivo donde vive. */
export function clavesUsadas(): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of archivos(RAIZ)) {
    if (esPrueba(p)) continue;
    const texto = readFileSync(p, 'utf8');
    for (const m of texto.matchAll(/\bt\(\s*['"]([a-zA-Z][\w.]*\.[\w.]+)['"]/g)) {
      if (!out.has(m[1])) out.set(m[1], p);
    }
  }
  return out;
}

const falta = (diccionario: unknown, clave: string): boolean => {
  const v = hoja(diccionario, clave);
  return v === undefined || typeof v === 'object';
};

/**
 * Las que faltan A PROPÓSITO.
 *
 * 🔴 `CuentaDeCobro.tsx` —el documento del período que se le manda al
 * inquilino— envuelve `t` con su propio mapa de textos y cae en él cuando el
 * panel devuelve la clave. Los textos viven AHÍ, en el componente, junto al
 * documento que imprimen. Duplicarlos en los dos diccionarios sería tenerlos
 * en dos sitios que se van a separar.
 *
 * Para declarar una clave nueva acá hace falta ese respaldo de verdad: un
 * `if (delPanel !== k)`. Un `t(...) || 'texto'` NO cuenta, porque no corre.
 */
const CON_RESPALDO_PROPIO = /^cuentaDeCobro\./;

describe('🔴 ninguna clave llega cruda a la pantalla', () => {
  it('toda clave usada tiene texto en castellano', () => {
    const faltantes = [...clavesUsadas()]
      .filter(([k]) => !CON_RESPALDO_PROPIO.test(k))
      .filter(([k]) => falta(es, k))
      .map(([k, d]) => `${k}   (${d})`)
      .sort();

    expect(
      faltantes,
      'Estas claves no tienen texto en `es.json`: se pintan CRUDAS.\n' +
        "🔴 Un `t('x') || 'texto'` no las salva — `t()` devuelve la clave, que\n" +
        'es un texto con contenido, así que el `||` nunca corre.\n\n  ' +
        `${faltantes.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('toda clave usada tiene texto en inglés', () => {
    const faltantes = [...clavesUsadas()]
      .filter(([k]) => !CON_RESPALDO_PROPIO.test(k))
      .filter(([k]) => falta(en, k))
      .map(([k, d]) => `${k}   (${d})`)
      .sort();

    expect(
      faltantes,
      `Estas claves no tienen texto en \`en.json\`:\n\n  ${faltantes.join('\n  ')}\n`,
    ).toEqual([]);
  });

  /** Un barrido roto no puede pasar en verde para siempre. */
  it('el barrido encuentra claves de verdad', () => {
    expect(clavesUsadas().size).toBeGreaterThan(2000);
  });
});
