/**
 * Guardia de las claves de la tabla de Cartera.
 *
 * Hermano de `claves-recibos.test.ts` y por el mismo motivo: una clave que
 * alguien agregue sólo en `es.json` sale en pantalla como
 * `cartera.tabla.sinTelefono` para quien use la app en inglés, y eso pasa una
 * revisión visual rápida sin saltar.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';

/** Todas las rutas hoja de un objeto, en notación de puntos. */
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

const CARTERA_ES = (es as Record<string, unknown>).cartera;
const CARTERA_EN = (en as Record<string, unknown>).cartera;

/**
 * Lo que consume `CarteraTable`. Escrito a mano a propósito: derivarlo del
 * diccionario haría que el test se compare contra sí mismo y pasara en verde
 * con una clave borrada.
 */
const CLAVES_EN_USO = [
  'tabla.inquilino',
  'tabla.inmueble',
  'tabla.propietario',
  'tabla.mes',
  'tabla.debe',
  'tabla.mora',
  'tabla.verCobro',
  'tabla.whatsapp',
  'tabla.vence',
  'tabla.abonado',
  'tabla.alDia',
  'tabla.unDiaDeMora',
  'tabla.diasDeMora',
  'tabla.unRecordatorio',
  'tabla.recordatorios',
  'tabla.sinRecordatorios',
  'tabla.sinInquilino',
  'tabla.sinTelefono',
  'tabla.sinDireccion',
  'tabla.sinPropietario',
];

/** Las claves que llevan `{{param}}` y qué parámetro esperan. */
const CON_PARAMETROS: Record<string, string[]> = {
  'tabla.vence': ['fecha'],
  'tabla.abonado': ['monto'],
  'tabla.diasDeMora': ['n'],
  'tabla.recordatorios': ['n'],
};

describe('el bloque `cartera` existe en los dos diccionarios', () => {
  it('es un bloque de nivel superior en es y en en', () => {
    expect(CARTERA_ES).toBeTypeOf('object');
    expect(CARTERA_EN).toBeTypeOf('object');
  });
});

describe('paridad es ↔ en', () => {
  it('los dos diccionarios tienen EXACTAMENTE las mismas claves', () => {
    expect(hojas(CARTERA_ES).sort()).toEqual(hojas(CARTERA_EN).sort());
  });

  it('ninguna traducción quedó vacía', () => {
    for (const dic of [CARTERA_ES, CARTERA_EN]) {
      for (const ruta of hojas(dic)) {
        const valor = leer(dic, ruta);
        expect(typeof valor, `${ruta} no es texto`).toBe('string');
        expect(String(valor).trim(), `${ruta} está vacía`).not.toBe('');
      }
    }
  });
});

describe('las claves que usa la tabla existen', () => {
  it.each(CLAVES_EN_USO)('%s está en los dos diccionarios', (ruta) => {
    expect(leer(CARTERA_ES, ruta), `falta en es.json: cartera.${ruta}`).toBeTypeOf('string');
    expect(leer(CARTERA_EN, ruta), `falta en en.json: cartera.${ruta}`).toBeTypeOf('string');
  });
});

describe('los parámetros de interpolación', () => {
  it.each(Object.entries(CON_PARAMETROS))(
    '%s interpola los mismos parámetros en los dos idiomas',
    (ruta, esperados) => {
      for (const [nombre, dic] of [
        ['es', CARTERA_ES],
        ['en', CARTERA_EN],
      ] as const) {
        const texto = String(leer(dic, ruta));
        for (const param of esperados) {
          // Un `{{monto}}` que se pierde en la traducción deja al usuario sin
          // la cifra — y el texto sigue leyéndose bien, así que nadie lo nota.
          expect(texto, `${nombre}: cartera.${ruta} perdió {{${param}}}`).toContain(
            `{{${param}}}`,
          );
        }
      }
    },
  );
});
