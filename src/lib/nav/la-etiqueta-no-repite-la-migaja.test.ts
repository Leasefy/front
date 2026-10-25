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

/** El sobretítulo del encabezado común (`seccion="…"` de <EncabezadoDePantalla>). */
function sobretitulo(texto: string): string | undefined {
  return /<EncabezadoDePantalla[\s\S]*?\sseccion="([^"]*)"/.exec(texto)?.[1]?.trim();
}

describe('las sub-pantallas de Contabilidad', () => {
  it('🔴 la etiqueta de sección no repite la palabra de la migaja', () => {
    const repiten = paginas()
      // C2 (revisora r25): el sobretítulo ya no es un <SectionLabel> suelto sino el de
      // <EncabezadoDePantalla>; la vuelta dice «Contabilidad» y el sobretítulo no la repite.
      .filter(({ texto }) => /[Cc]ontabilidad/.test(sobretitulo(texto) ?? ''))
      .map((p) => p.nombre);
    expect(repiten).toEqual([]);
  });

  it('todas dicen lo mismo arriba: la diferencia no significaba nada', () => {
    const etiquetas = new Set(
      paginas()
        .map(({ texto }) => sobretitulo(texto))
        .filter((e): e is string => Boolean(e)),
    );
    // C2 (revisora r25): «Dinero», como los centros de Contabilidad y Nómina.
    expect([...etiquetas]).toEqual(['Dinero']);
  });
});
