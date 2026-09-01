/**
 * Guardia de las claves de Inquilinos y Migración.
 *
 * `t(clave)` devuelve la CLAVE cuando falta la traducción. Una clave que
 * alguien agregue sólo en `es.json` no rompe nada: sale en pantalla como
 * `migracion.pasos.puc.titulo` para quien use la app en inglés, y eso pasa una
 * revisión visual rápida sin que salte.
 *
 * Hermano de `claves-avaluos.test.ts`, `claves-recorrido.test.ts` y
 * `claves-aprobacion.test.ts`. Con una diferencia: acá el juego de claves se
 * compara ENTERO entre los dos diccionarios en vez de contra una lista escrita
 * a mano, así que una clave nueva queda cubierta el día que se agrega y no el
 * día que alguien se acuerde de sumarla a este archivo. La lista de abajo
 * sigue existiendo para el otro lado del problema: una clave que las pantallas
 * consumen y que alguien borre del diccionario.
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';

const BLOQUES = ['inquilinos', 'migracion'] as const;

/** Lo que consume `/panel/inmobiliaria/inquilinos`. */
const CLAVES_DE_INQUILINOS = [
  'eyebrow',
  'titulo',
  'subtitulo',
  'queEs',
  'queSon',
  'buscarPlaceholder',
  'filtroEstado',
  'filtros.activos',
  'filtros.terminados',
  'filtros.todos',
  'kpi.personas',
  'kpi.arriendosVigentes',
  'kpi.canonVigente',
  'vacioDescripcion',
  'vacioMigrar',
  'vacioContrato',
  'sinContacto',
  'sinInmueble',
  'conteoArriendoUno',
  'conteoArriendos',
  'verFicha',
  // Los cuatro valores de `LeaseStatus` en el back. Si el back agrega un
  // quinto, la pantalla lo muestra crudo — pero estos cuatro tienen que estar.
  'estados.activo',
  'estados.porVencer',
  'estados.terminado',
  'estados.cancelado',
  'ficha.correo',
  'ficha.telefono',
  'ficha.canonVigente',
  'ficha.arriendos',
  'ficha.verContrato',
  'ficha.verCobros',
  'ficha.sinDato',
].map((c) => `inquilinos.${c}`);

/** Lo que consumen `/panel/inmobiliaria/migracion` y su paso 1. */
const CLAVES_DE_MIGRACION = [
  'eyebrow',
  'titulo',
  'subtitulo',
  'nav',
  'retomar',
  'empezar',
  'noDisponible',
  'retomarAviso',
  'orden.titulo',
  'orden.detalle',
  'estados.enConstruccion',
  'estados.enCurso',
  'estados.conDatos',
  'avance.hechas',
  'avance.porRevisar',
  'terceros.titulo',
  'terceros.subtitulo',
].map((c) => `migracion.${c}`);

/**
 * Los cinco pasos de la secuencia, cada uno con título y descripción.
 *
 * Los ids son los que `SecuenciaDeMigracion` arma con plantilla
 * (`migracion.pasos.${paso.id}.titulo`), así que un typo en uno de ellos no lo
 * agarra ni `tsc` ni el linter: sale en pantalla como la clave cruda.
 */
const CLAVES_DE_PASOS = ['terceros', 'propiedades', 'contratos', 'puc', 'contable'].flatMap(
  (id) => [`migracion.pasos.${id}.titulo`, `migracion.pasos.${id}.descripcion`],
);

const TODAS = [...CLAVES_DE_INQUILINOS, ...CLAVES_DE_MIGRACION, ...CLAVES_DE_PASOS];

function leer(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], diccionario);
}

function existe(diccionario: unknown, clave: string): boolean {
  const v = leer(diccionario, clave);
  return typeof v === 'string' && v.length > 0;
}

/** Todas las hojas de un bloque, en notación de puntos. */
function hojas(nodo: unknown, prefijo = ''): string[] {
  if (typeof nodo === 'string') return [prefijo];
  if (!nodo || typeof nodo !== 'object') return [];
  return Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) =>
    hojas(v, prefijo ? `${prefijo}.${k}` : k),
  );
}

/** `{{n}}`, `{{lote}}`… — lo que `interpolate()` va a reemplazar. */
function parametros(texto: string): string[] {
  return [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

describe('las claves de Inquilinos y Migración', () => {
  it('todas las que consumen las pantallas están en español', () => {
    expect(TODAS.filter((c) => !existe(es, c))).toEqual([]);
  });

  it('todas las que consumen las pantallas están en inglés', () => {
    expect(TODAS.filter((c) => !existe(en, c))).toEqual([]);
  });

  it('los dos diccionarios tienen EXACTAMENTE el mismo juego de claves', () => {
    // Cubre la clave nueva que alguien agregue mañana sólo de un lado, sin
    // tener que acordarse de sumarla a la lista de arriba.
    for (const bloque of BLOQUES) {
      const enEs = hojas(leer(es, bloque)).sort();
      const enEn = hojas(leer(en, bloque)).sort();
      expect(enEs.filter((c) => !enEn.includes(c)), `faltan en en.json (${bloque})`).toEqual([]);
      expect(enEn.filter((c) => !enEs.includes(c)), `faltan en es.json (${bloque})`).toEqual([]);
    }
  });

  it('ninguna clave quedó sin traducir', () => {
    /*
     * Sin esto, pegar el español en `en.json` pasaría los tres de arriba. Cero
     * excepciones a propósito: hoy no hay ninguna frase legítimamente igual en
     * los dos idiomas, y si algún día la hay (un nombre propio), que este test
     * obligue a declararla acá en vez de dejarla pasar por un margen.
     */
    for (const bloque of BLOQUES) {
      const identicas = hojas(leer(es, bloque))
        .map((c) => `${bloque}.${c}`)
        .filter((c) => leer(es, c) === leer(en, c));
      expect(identicas, `sin traducir en ${bloque}`).toEqual([]);
    }
  });

  it('la interpolación sobrevive a la traducción', () => {
    /*
     * `interpolate()` deja `{{n}}` literal en pantalla cuando el parámetro no
     * llega, y lo borra del texto cuando el traductor lo pierde. Los dos
     * idiomas tienen que pedir los MISMOS parámetros.
     */
    for (const bloque of BLOQUES) {
      for (const hoja of hojas(leer(es, bloque))) {
        const clave = `${bloque}.${hoja}`;
        expect(parametros(leer(en, clave) as string), `parámetros de ${clave}`).toEqual(
          parametros(leer(es, clave) as string),
        );
      }
    }
  });

  it('los conteos de arriendos interpolan lo que la pantalla les pasa', () => {
    // La pantalla manda `{ n, vigentes }`. Un texto que no los nombre muestra
    // «arriendos ·  vigentes» sin número y nadie lo nota en una captura.
    for (const d of [es, en]) {
      expect(parametros(leer(d, 'inquilinos.conteoArriendos') as string)).toEqual([
        'n',
        'vigentes',
      ]);
      // El singular no lleva `{{n}}`: ya dice «1».
      expect(parametros(leer(d, 'inquilinos.conteoArriendoUno') as string)).toEqual(['vigentes']);
      expect(parametros(leer(d, 'migracion.avance.porRevisar') as string)).toEqual(['lote', 'n']);
    }
  });

  it('no se pisó el bloque `inquilino` (singular), que es otra cosa', () => {
    // `inquilino` es el portal del inquilino y existía desde antes; `inquilinos`
    // es la sección de la inmobiliaria. Un bloque de nivel superior escrito
    // encima del otro se lleva puesto medio producto sin un error.
    for (const d of [es, en]) {
      expect(typeof (d as Record<string, unknown>).inquilino).toBe('object');
      expect(typeof (d as Record<string, unknown>).inquilinos).toBe('object');
    }
  });
});
