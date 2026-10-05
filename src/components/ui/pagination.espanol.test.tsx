/**
 * QA-INQ-95 (D-09, 04-10-2026): el paginador del portal se leía «Anterior 1 2 3
 * More pages 5 Siguiente» y sus botones decían «Go to next page» a un lector de
 * pantalla. El producto es en español.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('el paginador habla español', () => {
  it('sin etiquetas en inglés', () => {
    const fuente = readFileSync(join(__dirname, 'pagination.tsx'), 'utf8');
    for (const ingles of ['More pages', 'Go to next page', 'Go to previous page', 'Go to first page', 'Go to last page', 'aria-label="pagination"']) {
      expect(fuente).not.toContain(ingles);
    }
    expect(fuente).toContain('Más páginas');
    expect(fuente).toContain('aria-label="Página siguiente"');
  });
});
