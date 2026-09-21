/**
 * 🔴 Un fallo a PANTALLA COMPLETA tiene que decir dónde estás y cómo salir.
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 *
 * 20-09. La Agenda mandaba a `/panel/inmobiliaria/contratos/{id}` con el id de
 * un `Lease`, así que la pantalla caía en su rama de «no encontramos este
 * contrato». Nico la vio y dijo: «esto está mal realmente, ni se entiende y no
 * tiene navegación para recuperarse».
 *
 * Tenía razón en las dos cosas. La rama devolvía SÓLO la tarjeta del fallo,
 * centrada en una caja de `max-w-2xl` con `py-16` por fuera y otro `py-16` por
 * dentro: una caja enorme y vacía, sin encabezado, sin migaja y sin nada que
 * dijera en qué parte del panel estabas. El único camino de vuelta era un
 * botón adentro de la tarjeta.
 *
 * ── Qué exige esta prueba ───────────────────────────────────────────────────
 *
 * Que en el MISMO `return` donde una ficha pinta `<FalloDeCarga …>` a pantalla
 * completa haya también una salida propia de la pantalla (`BackButton`,
 * `VolverALaLista` o un `<Link>` de vuelta). No alcanza con que el archivo
 * tenga una salida en OTRA rama: el defecto es precisamente que la rama del
 * fallo se escribe aparte y se olvida.
 *
 * Es estático a propósito: montar catorce fichas con sus providers, permisos y
 * hooks de red para comprobar una sola cosa cuesta mucho más y falla por
 * motivos que no son éste. El precio es que mira el texto del archivo; por eso
 * la prueba de abajo comprueba que sigue ENCONTRANDO fichas.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(process.cwd(), 'src/app/panel/inmobiliaria');

/** Formas de «acá se sale», todas vigentes en el panel. */
const SALIDAS = [/<BackButton/, /<VolverALaLista/, /<Link\s+href=/];

function archivosDePantalla(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivosDePantalla(ruta, encontrados);
      continue;
    }
    if (!/\.tsx$/.test(entrada.name)) continue;
    if (/\.test\.tsx$/.test(entrada.name)) continue;
    /*
     * Sólo las FICHAS: las que viven bajo un segmento dinámico (`[id]`,
     * `[carrier]`…). Son las que se abren desde una lista y a las que se llega
     * por un enlace, así que el camino de vuelta no está en el menú.
     *
     * Una pantalla de primer nivel que falla (Reportes, Cobranza) también se
     * queda sin encabezado y eso es deuda anotada, pero su entrada SÍ está en
     * el menú de la izquierda: no es el mismo defecto y forzarlo acá mezcla
     * dos cosas.
     */
    if (!/\[[^\]]+\]/.test(relative(RAIZ, ruta))) continue;
    encontrados.push(ruta);
  }
  return encontrados;
}

/**
 * El `return ( … );` que envuelve a la posición `i`.
 *
 * Se camina hacia atrás hasta el `return (` más cercano y hacia adelante
 * contando paréntesis. Un `return <FalloDeCarga …/>` sin paréntesis no existe
 * hoy en el panel; si apareciera, esta función devuelve `null` y el archivo no
 * se juzga — prefiero no juzgar a juzgar mal.
 */
function bloqueDelReturn(texto: string, i: number): string | null {
  const abre = texto.lastIndexOf('return (', i);
  if (abre === -1) return null;
  let profundidad = 0;
  for (let j = abre + 'return '.length; j < texto.length; j++) {
    if (texto[j] === '(') profundidad++;
    else if (texto[j] === ')') {
      profundidad--;
      if (profundidad === 0) return texto.slice(abre, j + 1);
    }
  }
  return null;
}

/** Los `<FalloDeCarga` que ocupan la pantalla entera (su propio `return`). */
function fallosAPantallaCompleta(texto: string): string[] {
  const bloques: string[] = [];
  let desde = 0;
  for (;;) {
    const i = texto.indexOf('<FalloDeCarga', desde);
    if (i === -1) break;
    desde = i + 1;
    const bloque = bloqueDelReturn(texto, i);
    if (!bloque) continue;
    /*
     * Un `FalloDeCarga` DENTRO de la pantalla —en una tarjeta de un bloque que
     * falló, con el resto de la página viva— no necesita salida propia: la
     * pantalla ya tiene la suya. Se reconocen porque su `return` trae también
     * el contenido bueno. La heurística: el bloque del fallo a pantalla
     * completa es corto y no monta la ficha entera.
     */
    if (bloque.length > 2000) continue;
    bloques.push(bloque);
  }
  return bloques;
}

describe('el fallo de una ficha', () => {
  const archivos = archivosDePantalla(RAIZ);

  it('🔴 cuando ocupa la pantalla entera, tiene su propia salida arriba', () => {
    const culpables: string[] = [];
    for (const archivo of archivos) {
      const texto = readFileSync(archivo, 'utf8');
      if (!texto.includes('<FalloDeCarga')) continue;
      for (const bloque of fallosAPantallaCompleta(texto)) {
        if (!SALIDAS.some((re) => re.test(bloque))) {
          culpables.push(relative(process.cwd(), archivo));
        }
      }
    }
    expect([...new Set(culpables)]).toEqual([]);
  });

  it('mide algo: encuentra fichas con fallo a pantalla completa', () => {
    const conFallo = archivos.filter((a) =>
      fallosAPantallaCompleta(readFileSync(a, 'utf8')).length > 0,
    );
    expect(conFallo.length).toBeGreaterThanOrEqual(5);
  });
});
