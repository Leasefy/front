/**
 * Guardia de las claves del ESTADO DE CUENTA.
 *
 * Hermano de `claves-cartera.test.ts`. Las palabras del documento vivían en
 * `components/estado-de-cuenta/textos.ts`; desde el 2026-09-16 viven en
 * `locales/es.json` y `locales/en.json`, bloque `estadoDeCuenta`, y `textos.ts`
 * las lee de ahí. Lo que se protege:
 *
 *   · que los dos idiomas tengan EXACTAMENTE las mismas claves, sin vacíos;
 *   · que cada `{{parámetro}}` sobreviva a la traducción;
 *   · que toda clave `estadoDeCuenta.*` escrita en el código exista — sacada
 *     del CÓDIGO y no del diccionario, para que el test no se compare contra
 *     sí mismo y pase en verde con una clave borrada.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';
import { TEXTO, texto } from '@/components/estado-de-cuenta/textos';

function hojas(obj: unknown, prefijo = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefijo];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    hojas(v, prefijo ? `${prefijo}.${k}` : k),
  );
}

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

const ES = (es as Record<string, unknown>).estadoDeCuenta;
const EN = (en as Record<string, unknown>).estadoDeCuenta;

/** Todos los .ts/.tsx de `src`, sin las pruebas. */
function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

/** Las claves LITERALES del código. Las que se arman con `${…}` terminan en punto y se saltan. */
const CLAVES_EN_EL_CODIGO = [
  ...new Set(
    fuentes(join(__dirname, '..', '..'))
      .flatMap((archivo) =>
        [...readFileSync(archivo, 'utf8').matchAll(/['"`](estadoDeCuenta\.[A-Za-z.]+)/g)].map(
          (m) => m[1],
        ),
      )
      .filter((clave) => !clave.endsWith('.')),
  ),
].sort();

describe('el bloque `estadoDeCuenta`', () => {
  it('existe en los dos diccionarios', () => {
    expect(ES).toBeTypeOf('object');
    expect(EN).toBeTypeOf('object');
  });

  it('los dos idiomas tienen EXACTAMENTE las mismas claves', () => {
    expect(hojas(ES).sort()).toEqual(hojas(EN).sort());
  });

  it('ninguna traducción quedó vacía', () => {
    for (const dic of [ES, EN]) {
      for (const ruta of hojas(dic)) {
        const valor = leer(dic, ruta);
        expect(typeof valor, `${ruta} no es texto`).toBe('string');
        expect(String(valor).trim(), `${ruta} está vacía`).not.toBe('');
      }
    }
  });

  it('cada {{parámetro}} está en los dos idiomas', () => {
    for (const ruta of hojas(ES)) {
      const params = [...String(leer(ES, ruta)).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      const enIngles = [...String(leer(EN, ruta)).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      expect(enIngles, `estadoDeCuenta.${ruta}`).toEqual(params);
    }
  });
});

describe('las claves que usa el código existen', () => {
  it('encuentra claves en el código (si no, el recorrido está roto)', () => {
    expect(CLAVES_EN_EL_CODIGO.length).toBeGreaterThan(100);
  });

  it.each(CLAVES_EN_EL_CODIGO)('%s está en los dos diccionarios', (clave) => {
    const ruta = clave.slice('estadoDeCuenta.'.length);
    expect(leer(ES, ruta), `falta en es.json: ${clave}`).toBeTypeOf('string');
    expect(leer(EN, ruta), `falta en en.json: ${clave}`).toBeTypeOf('string');
  });
});

describe('`textos.ts` lee el diccionario', () => {
  it('trae cada clave del bloque, con el texto en castellano', () => {
    expect(Object.keys(TEXTO).sort()).toEqual(hojas(ES, 'estadoDeCuenta').sort());
    expect(texto('estadoDeCuenta.titulo')).toBe('Estado de cuenta');
    expect(texto('estadoDeCuenta.volver.contrato')).toBe('Volver al contrato');
    expect(texto('estadoDeCuenta.enMoraDias', { dias: 100 })).toBe('En mora · 100 días');
  });
});
