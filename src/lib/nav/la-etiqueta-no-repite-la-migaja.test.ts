/**
 * 🔴 LA ETIQUETA DE SECCIÓN NO REPITE LA MIGAJA.
 *
 * 20-09 · Al ponerle a «Presupuesto» el «← Contabilidad» que le faltaba, la
 * pantalla quedó diciendo «Contabilidad» dos veces seguidas: la migaja y
 * debajo la etiqueta, que en esa página era «Contabilidad» mientras las otras
 * nueve decían «Finanzas». Nadie lo habría visto hasta abrirla.
 *
 * Además de arreglarlo, la prueba fija la CONSISTENCIA: las doce sub-pantallas
 * de Contabilidad dicen lo mismo arriba. Tres decían cosas distintas —«Finanzas
 * · contabilidad» dos de ellas— y esa diferencia no significaba nada.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'src/app/panel/inmobiliaria/contabilidad');

function paginas(): { nombre: string; texto: string }[] {
  return readdirSync(RAIZ, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(RAIZ, e.name, 'page.tsx')))
    .map((e) => ({
      nombre: e.name,
      texto: readFileSync(join(RAIZ, e.name, 'page.tsx'), 'utf8'),
    }));
}

describe('las sub-pantallas de Contabilidad', () => {
  it('🔴 la etiqueta de sección no repite la palabra de la migaja', () => {
    const repiten = paginas()
      .filter(({ texto }) => /<SectionLabel>[^<]*[Cc]ontabilidad[^<]*<\/SectionLabel>/.test(texto))
      .map((p) => p.nombre);
    expect(repiten).toEqual([]);
  });

  it('todas dicen lo mismo arriba: la diferencia no significaba nada', () => {
    const etiquetas = new Set(
      paginas()
        .map(({ texto }) => /<SectionLabel>([^<]*)<\/SectionLabel>/.exec(texto)?.[1]?.trim())
        .filter((e): e is string => Boolean(e)),
    );
    expect([...etiquetas]).toEqual(['Finanzas']);
  });
});
