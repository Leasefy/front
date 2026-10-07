/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026): los textos no mandan al «paso 4».
 *
 * Visto en el navegador: el libro diario con una cuenta que no existe decía
 * «Créalas en el paso 4 con tu contador» y «Crear las cuentas en el paso 4»,
 * y sin plan de cuentas «Carga el plan en el paso 4» / «Ir al paso 4». En el
 * muro el plan de cuentas es el PASO 5 DE 6 (la barra lo dice así) y fuera del
 * muro no hay pasos: el número no lleva a ningún lado. Se nombra el lugar.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El texto que ve la persona: sin comentarios de bloque ni de línea. */
function textoVisible(archivo: string): string {
  const fuente = readFileSync(join(__dirname, archivo), 'utf8');
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('el plan de cuentas se nombra, no se numera (QA-MIGRACION-95)', () => {
  for (const archivo of ['MigrarAsientos.tsx', 'RegistrosContables.tsx']) {
    it(`${archivo} no dice «paso 4» a la persona`, () => {
      expect(textoVisible(archivo)).not.toMatch(/paso 4/i);
    });
  }
});
