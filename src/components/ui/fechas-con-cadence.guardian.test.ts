/**
 * 🔴 Nico, 10-10-2026, con la captura del calendario del navegador: «este no
 * usa Cadence». El `<input type="date">` (y `month`, `datetime-local`) pinta
 * la fecha en el idioma y formato del SISTEMA («dd/mm/yyyy», «October 2026»)
 * y abre un calendario que no se parece a nada del producto.
 *
 * Ese día se pasaron todos a los campos de la casa: `CampoDeDia` (calendario
 * de Cadence), `CampoDeFecha` (Facturación), `CampoDeNacimiento` (se escribe)
 * y `CampoDeMes`. Este guardián no deja volver un campo de fecha del navegador.
 *
 * Fuera: `/admin` (backoffice con su propio sistema, `admin.css`), las pruebas
 * y los comentarios que cuentan la historia.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..', '..');

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === 'node_modules' ? [] : archivos(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const CAMPO_DEL_NAVEGADOR = /\btype=(?:"(?:date|month|datetime-local)"|\{\s*["'](?:date|month|datetime-local)["']\s*\})/;

/** La línea sin `// …`, `/* … *\/`, `{/* … *\/}`, ni la continuación de un bloque (`* …`). */
function sinComentarios(linea: string): string {
  if (/^\s*(\*|\/\*|\{\/\*)/.test(linea)) return '';
  return linea.replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, '').replace(/`[^`]*`/g, '');
}

describe('🔴 las fechas usan los campos de Cadence, no los del navegador', () => {
  it('ningún <input type="date|month|datetime-local"> fuera de /admin', () => {
    const malos = archivos(RAIZ)
      .filter((ruta) => !relative(RAIZ, ruta).startsWith(join('app', 'admin')))
      .flatMap((ruta) =>
        readFileSync(ruta, 'utf8')
          .split('\n')
          // Sin los comentarios (los que cuentan por qué se quitó).
          .map((linea, i) => ({ linea: sinComentarios(linea), n: i + 1 }))
          .filter(({ linea }) => CAMPO_DEL_NAVEGADOR.test(linea))
          .map(({ n }) => `${relative(RAIZ, ruta)}:${n}`),
      );
    expect(malos).toEqual([]);
  });
});
