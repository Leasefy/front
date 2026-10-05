/**
 * 🔴 UNA `page.tsx` O UN `layout.tsx` SÓLO EXPORTA LO QUE NEXT ENTIENDE.
 *
 * ── Por qué existe (04-10-2026) ────────────────────────────────────────────
 *
 * `admin/(panel)/chat-preguntas/page.tsx` exportaba dos ayudantes de formato
 * (`fuenteLegible` y `usd`). Las pruebas pasaban y `tsc` del proyecto también,
 * pero `next build` revisa los tipos generados en `.next/types` y ahí una
 * página con una exportación que no es de Next ROMPE EL BUILD: el despliegue
 * de `bugs-nico-1` no habría salido. Lo vio el agente que trajo el director al
 * rebasar, no ninguna prueba.
 *
 * Los ayudantes que una página quiera compartir van en su propio archivo.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = resolve(__dirname);

/** Lo que Next acepta exportar desde una página o un layout. */
const DE_NEXT = new Set([
  'default',
  'metadata',
  'generateMetadata',
  'viewport',
  'generateViewport',
  'generateStaticParams',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  'experimental_ppr',
]);

function paginas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return /^(page|layout)\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

function exportados(fuente: string): string[] {
  const nombres: string[] = [];
  for (const m of fuente.matchAll(
    /^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm,
  )) {
    nombres.push(m[1]);
  }
  for (const m of fuente.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const parte of m[1].split(',')) {
      const nombre = parte.trim().split(/\s+as\s+/).pop()?.trim();
      if (nombre && !nombre.startsWith('type ')) nombres.push(nombre);
    }
  }
  return nombres;
}

describe('páginas y layouts: sólo exportan lo de Next', () => {
  it('ninguna page.tsx ni layout.tsx exporta un ayudante propio', () => {
    const malas = paginas(APP).flatMap((archivo) =>
      exportados(readFileSync(archivo, 'utf8'))
        .filter((nombre) => !DE_NEXT.has(nombre))
        .map((nombre) => `${relative(APP, archivo)} → ${nombre}`),
    );
    expect(malas).toEqual([]);
  });

  it('el detector ve una exportación que rompe el build', () => {
    expect(exportados('export function fuenteLegible() {}\nexport default function P() {}')).toEqual([
      'fuenteLegible',
    ]);
  });
});
