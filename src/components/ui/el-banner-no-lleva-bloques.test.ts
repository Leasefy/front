/**
 * El `Banner` de cadence pinta sus hijos DENTRO de un `<p>`.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * Un `<div>`, `<p>` o `<ul>` adentro de un `<p>` es HTML inválido: el
 * navegador cierra el `<p>` antes de tiempo, el árbol que hidrata React no es
 * el que pintó el servidor y la consola se llena de «In HTML, <div> cannot be
 * a descendant of <p>. This will cause a hydration error.». QA 23-09: el
 * detalle del lote lo tenía en tres avisos (facturación, extractos y el del
 * archivo anulado) y Contabilidad en dos.
 *
 * `Banner` vive en `@leasefy/cadence`, que no se toca desde acá, así que la
 * regla se cuida en el call site: sólo contenido EN LÍNEA (`span` con
 * `block`, `role="list"`/`listitem` para las listas). Estático a propósito:
 * montar cada aviso en el estado que lo muestra cuesta mucho más.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(process.cwd(), 'src');

function archivosTsx(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) archivosTsx(ruta, encontrados);
    else if (entrada.name.endsWith('.tsx') && !entrada.name.includes('.test.')) encontrados.push(ruta);
  }
  return encontrados;
}

/** Dónde termina la etiqueta de apertura: el `>` fuera de toda llave. */
function finDeLaApertura(fuente: string, desde: number): { fin: number; sola: boolean } {
  let llaves = 0;
  for (let i = desde; i < fuente.length; i++) {
    const c = fuente[i];
    if (c === '{') llaves++;
    else if (c === '}') llaves--;
    else if (c === '>' && llaves === 0) return { fin: i + 1, sola: fuente[i - 1] === '/' };
  }
  return { fin: fuente.length, sola: true };
}

const BLOQUE = /<(p|div|ul|ol|li|table|section|h[1-6])\b/;

function bannersConBloques(fuente: string): number[] {
  const lineas: number[] = [];
  const re = /<Banner\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fuente))) {
    const { fin, sola } = finDeLaApertura(fuente, m.index + '<Banner'.length);
    if (sola) continue;
    const cierre = fuente.indexOf('</Banner>', fin);
    if (cierre === -1) continue;
    // Sin comentarios: un `{/* … <p> … */}` explica la regla, no la rompe.
    const hijos = fuente.slice(fin, cierre).replace(/\/\*[\s\S]*?\*\//g, '');
    if (BLOQUE.test(hijos)) lineas.push(fuente.slice(0, m.index).split('\n').length);
  }
  return lineas;
}

describe('el Banner de cadence no lleva bloques adentro (su contenido va en un <p>)', () => {
  it('el detector ve un <div> y un <ul>, y no confunde un ícono en una prop', () => {
    expect(bannersConBloques('<Banner title="x">\n  <div>a</div>\n</Banner>')).toEqual([1]);
    expect(bannersConBloques('<Banner><ul><li>a</li></ul></Banner>')).toEqual([1]);
    expect(
      bannersConBloques('<Banner icon={cond ? (<Clock />) : null}>\n<span className="block">a</span></Banner>'),
    ).toEqual([]);
    expect(bannersConBloques('<Banner>{/* no un <div> */}<span>a</span></Banner>')).toEqual([]);
  });

  it('ningún archivo del producto le mete <p>/<div>/<ul> al Banner', () => {
    const malos: string[] = [];
    for (const archivo of archivosTsx(RAIZ)) {
      const fuente = readFileSync(archivo, 'utf8');
      if (!/import\s*\{[^}]*\bBanner\b[^}]*\}\s*from\s*'@leasefy\/cadence'/.test(fuente)) continue;
      for (const linea of bannersConBloques(fuente)) {
        malos.push(`${relative(RAIZ, archivo).replace(/\\/g, '/')}:${linea}`);
      }
    }
    expect(malos).toEqual([]);
  });
});
