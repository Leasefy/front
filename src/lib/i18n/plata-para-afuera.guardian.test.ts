/**
 * 🔴 GUARDIÁN: LO QUE SALE PARA AFUERA ESCRIBE LA PLATA COMO EN COLOMBIA.
 *
 * Desde el 16-10-2026 (Nico: «Estilo EE. UU. en todo») `formatCurrency` y
 * `formatNumber` sin idioma siguen al panel: con el panel en inglés escriben
 * «$ 5,450,000» (`idioma-de-las-cifras.ts`). Eso es para la PANTALLA.
 *
 * Un PDF, un Excel o un WhatsApp con el texto armado van al inquilino o al
 * propietario, en español: ahí «$ 2,350,000» se puede leer como dos coma
 * treinta y cinco. Este guardián lee los archivos que arman algo así y exige
 * que cada `formatCurrency(…)` / `formatNumber(…)` importado de `lib/format` (o
 * de `lib/types/inmobiliaria`) diga su idioma: `formatCurrency(x, 'es')`.
 *
 * No ve lo que una función recibe por parámetro (el mensaje de la renovación
 * recibe su `formatCurrency`): eso lo cuida la prueba de quien la llama.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const AFUERA =
  /from ['"](jspdf|xlsx|@react-pdf\/renderer)['"]|import\(['"](jspdf|xlsx|@react-pdf\/renderer)['"]\)|wa\.me\/[^'"`]*\?text=|mailto:[^'"`]*\?[^'"`]*body=/;

const IMPORTA_EL_FORMATO =
  /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/(format|types\/inmobiliaria)['"]/g;

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$|\.d\.ts$/.test(p)) out.push(p);
  }
  return out;
}

/** Los nombres con que el archivo importó `formatCurrency` / `formatNumber` (con su alias). */
function nombresImportados(texto: string): string[] {
  const nombres: string[] = [];
  for (const m of texto.matchAll(IMPORTA_EL_FORMATO)) {
    for (const parte of m[1].split(',')) {
      const [original, alias] = parte.trim().split(/\s+as\s+/);
      if (original === 'formatCurrency' || original === 'formatNumber') nombres.push((alias ?? original).trim());
    }
  }
  return nombres;
}

/** Cada llamada a uno de esos nombres SIN segundo argumento. */
function sinIdioma(texto: string, nombres: readonly string[]): string[] {
  const malas: string[] = [];
  for (const nombre of nombres) {
    const re = new RegExp(`(?<![\\w.])${nombre}\\(`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) {
      let i = m.index + m[0].length;
      let prof = 1;
      let coma = false;
      for (; i < texto.length && prof > 0; i++) {
        const ch = texto[i];
        if ('([{'.includes(ch)) prof++;
        else if (')]}'.includes(ch)) prof--;
        else if (ch === ',' && prof === 1) coma = true;
      }
      if (!coma) malas.push(texto.slice(m.index, i).replace(/\s+/g, ' ').slice(0, 100));
    }
  }
  return malas;
}

describe('🔴 la plata de lo que sale para afuera, como en Colombia', () => {
  const deAfuera = archivos('src').filter((f) => AFUERA.test(readFileSync(f, 'utf8')));

  it('encuentra los archivos que arman PDF, Excel o mensajes (si encuentra pocos, la aguja se rompió)', () => {
    expect(deAfuera.length).toBeGreaterThan(10);
  });

  it('cada formatCurrency / formatNumber de esos archivos dice su idioma', () => {
    const malas = deAfuera.flatMap((f) => {
      const texto = readFileSync(f, 'utf8');
      return sinIdioma(texto, nombresImportados(texto)).map((s) => `${f} :: ${s}`);
    });
    expect(
      malas,
      'Esto sale para un inquilino o un propietario: pasa el idioma, `formatCurrency(x, \'es\')`. ' +
        'Sin idioma sigue al panel y, con el panel en inglés, escribiría «$ 2,350,000».',
    ).toEqual([]);
  });
});
