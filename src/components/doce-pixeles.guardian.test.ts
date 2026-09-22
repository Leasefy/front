/**
 * 🔴 GUARDIÁN: LOS 12 PÍXELES NO CRECEN.
 *
 * ── Qué mide, y por qué importa el número ──────────────────────────────────
 *
 * `docs/DESIGN.md` manda: `.text-body` 16, `.text-body-sm` 14, `.text-caption`
 * 13. **Nada que se lea como CONTENIDO va en 12.** En 12 px viven los rótulos
 * —`.text-label` son 11 y van en mayúsculas— y poco más.
 *
 * ── Lo que apareció el 22-09 al medirlo en el navegador ────────────────────
 *
 * `.text-caption` NO era 13 px: `globals.css` la definía como `@apply text-xs`,
 * o sea 12. La escala del producto saltaba de 11 a 12 y de ahí a 14: el escalón
 * de 13 no existía. Y como veníamos cambiando `text-xs` por `text-caption` para
 * sacar el contenido de los 12 px, esos cambios **no cambiaban el tamaño**:
 * sólo el interlineado.
 *
 * Se arregló en el origen —una línea de `globals.css`, alineada con el preset
 * de `@leasefy/cadence`— y eso puso en 13 px los 633 usos de `.text-caption`
 * de una vez, sin tocar 633 archivos.
 *
 * ── Qué queda ──────────────────────────────────────────────────────────────
 *
 * Los `text-xs` sueltos. Bajarlos es trabajo de pantalla —hay que mirar cada
 * uno y decidir si es rótulo (12 está bien) o contenido (13 mínimo)—, y se hizo
 * en los módulos ya revisados: facturación, listas restrictivas, contabilidad,
 * finanzas, nómina, migración y dispersión.
 *
 * 🔴 Este guardián no pide que el número baje: pide que NO SUBA. Un `text-xs`
 * nuevo en una pantalla nueva es contenido en 12 px otra vez.
 *
 * `/admin` queda fuera a propósito: su `CLAUDE.md` dice que tiene su propio
 * sistema de diseño y NO usa el de `DESIGN.md`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAICES = ['src/app', 'src/components', 'src/lib'];

const esPrueba = (p: string) =>
  /\.test\.tsx?$|\.spec\.tsx?$|__tests__|\/tests\//.test(p);

/** `/admin` tiene su propio sistema de diseño. */
const esDelAdmin = (p: string) => p.includes('/admin/');

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

export function contarDoce(): { total: number; porArchivo: Map<string, number> } {
  const porArchivo = new Map<string, number>();
  let total = 0;
  for (const raiz of RAICES) {
    for (const p of archivos(raiz)) {
      if (esPrueba(p) || esDelAdmin(p)) continue;
      const n = (readFileSync(p, 'utf8').match(/\btext-xs\b/g) ?? []).length;
      if (n > 0) {
        porArchivo.set(p, n);
        total += n;
      }
    }
  }
  return { total, porArchivo };
}

/**
 * Medido el 22-09-2026, después de bajar 470 en los módulos ya revisados
 * (contabilidad, finanzas, nómina, migración, dispersión, cobros, mensajes y
 * contratos).
 *
 * Para bajarlo hay que MIRAR la pantalla: `text-xs` en un rótulo en mayúsculas
 * se queda; en un `<p>`, en una celda o en un `role="alert"` pasa a
 * `text-caption`. No sirve un reemplazo a ciegas sobre los 2783 restantes.
 */
const CUANTOS_HABIA = 2785;

describe('🔴 el contenido no se lee en 12 píxeles', () => {
  it('no entran `text-xs` nuevos', () => {
    const { total, porArchivo } = contarDoce();
    const peores = [...porArchivo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([p, n]) => `${n}  ${p}`)
      .join('\n  ');

    expect(
      total,
      `Había ${CUANTOS_HABIA} \`text-xs\` fuera de /admin y ahora hay ${total}.\n` +
        'Si subió: lo que acabas de escribir pinta contenido en 12 px. Usa\n' +
        '`text-caption` (13) para contenido y deja `text-xs` sólo en rótulos.\n' +
        'Si bajó: bien — actualiza CUANTOS_HABIA a ' +
        `${total} para que el número siga significando algo.\n\n  ${peores}\n`,
    ).toBe(CUANTOS_HABIA);
  });

  /** Un barrido roto no puede pasar en verde para siempre. */
  it('el barrido mira archivos de verdad', () => {
    const { porArchivo } = contarDoce();
    expect(porArchivo.size).toBeGreaterThan(400);
  });
});
