/**
 * Guardia de las claves de Reglas de mora.
 *
 * Hermano de `claves-recibos.test.ts` y compañía, y por el mismo motivo: una
 * clave que alguien agregue sólo en `es.json` sale en pantalla como
 * `reglasDeMora.tabla.loQueSea` para quien use la app en inglés, y eso pasa
 * una revisión visual rápida sin saltar.
 *
 * La lista está escrita a mano a propósito: derivarla del diccionario haría
 * que el test se compare contra sí mismo y pasara en verde con una clave
 * borrada de la pantalla.
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

const ES = (es as Record<string, unknown>).reglasDeMora;
const EN = (en as Record<string, unknown>).reglasDeMora;

/** Lo que consume `ReglasDeMora.tsx`, clave por clave. */
const CLAVES_EN_USO = [
  'queEs',
  'queSon',
  'conteo.una',
  'conteo.varias',
  'tabla.orden',
  'tabla.regla',
  'tabla.disparo',
  'tabla.cobro',
  'tabla.tope',
  'tabla.estado',
  'tabla.acciones',
  'tabla.activa',
  'tabla.apagada',
  'tabla.editar',
  'vacio.titulo',
  'vacio.descripcion',
  'vacio.crear',
  'sugerencias.etiqueta',
  'sugerencias.usar',
  'sugerencias.vacioTitulo',
  'sugerencias.vacioDescripcion',
  'sugerencias.conReglasTitulo',
  'sugerencias.conReglasDescripcion',
] as const;

function valor(raiz: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((actual, parte) => {
    if (actual && typeof actual === 'object' && parte in actual) {
      return (actual as Record<string, unknown>)[parte];
    }
    return undefined;
  }, raiz);
}

describe('claves de reglasDeMora', () => {
  it('el namespace existe en los dos idiomas', () => {
    expect(ES).toBeTypeOf('object');
    expect(EN).toBeTypeOf('object');
  });

  it('es y en tienen exactamente las mismas hojas', () => {
    expect(hojas(EN).sort()).toEqual(hojas(ES).sort());
  });

  it.each(CLAVES_EN_USO)('«%s» está traducida en los dos idiomas', (ruta) => {
    for (const [idioma, raiz] of [
      ['es', ES],
      ['en', EN],
    ] as const) {
      const texto = valor(raiz, ruta);
      expect(typeof texto, `${idioma}.reglasDeMora.${ruta}`).toBe('string');
      expect((texto as string).trim().length, `${idioma}.reglasDeMora.${ruta}`).toBeGreaterThan(0);
    }
  });

  it('no sobra ninguna clave: el diccionario es exactamente lo que la pantalla usa', () => {
    expect(hojas(ES).sort()).toEqual([...CLAVES_EN_USO].sort());
  });
});
