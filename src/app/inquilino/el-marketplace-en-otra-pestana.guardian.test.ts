/**
 * Guardián (reunión del 21-10-2026 con Portofino): «un enlace del portal me
 * sacó del portal». Buscar arriendo se hace en el marketplace (`/propiedades`),
 * que se abre en OTRA pestaña: la persona no pierde su portal.
 *
 * Barre el portal del inquilino (sus pantallas y las piezas que sólo usa él) y
 * exige que todo enlace a `/propiedades…` lleve `target="_blank"` y
 * `rel="noopener noreferrer"` en la misma etiqueta.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '..', '..', '..');
const CARPETAS = ['src/app/inquilino'];
/** Piezas que sólo vive el portal del inquilino. */
const ARCHIVOS = ['src/components/tenant/PropertyMatchCard.tsx', 'src/components/tenant/PropertyDetailSheet.tsx'];

function archivosTsx(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosTsx(ruta));
    else if (ruta.endsWith('.tsx') && !ruta.includes('.test.')) salida.push(ruta);
  }
  return salida;
}

/** La etiqueta de apertura que contiene la posición `i` (desde su `<` hasta su `>`). */
function etiquetaEn(texto: string, i: number): string {
  const inicio = texto.lastIndexOf('<', i);
  let profundidad = 0;
  for (let j = inicio; j < texto.length; j++) {
    const c = texto[j];
    if (c === '{') profundidad++;
    else if (c === '}') profundidad--;
    else if (c === '>' && profundidad === 0) return texto.slice(inicio, j + 1);
  }
  return texto.slice(inicio);
}

describe('el marketplace se abre en otra pestaña desde el portal del inquilino', () => {
  const archivos = [
    ...CARPETAS.flatMap((c) => archivosTsx(join(RAIZ, c))),
    ...ARCHIVOS.map((a) => join(RAIZ, a)),
  ];

  it('encuentra pantallas que revisar', () => {
    expect(archivos.length).toBeGreaterThan(20);
  });

  it('todo enlace a /propiedades lleva target="_blank" y rel="noopener noreferrer"', () => {
    const malos: string[] = [];
    for (const ruta of archivos) {
      const texto = readFileSync(ruta, 'utf8');
      const patron = /href=(?:\{`|"|\{')\/propiedades/g;
      let m: RegExpExecArray | null;
      while ((m = patron.exec(texto))) {
        const etiqueta = etiquetaEn(texto, m.index);
        if (!/target="_blank"/.test(etiqueta) || !/rel="noopener noreferrer"/.test(etiqueta)) {
          const linea = texto.slice(0, m.index).split('\n').length;
          malos.push(`${ruta.replace(RAIZ + '/', '')}:${linea}`);
        }
      }
    }
    expect(malos).toEqual([]);
  });
});
