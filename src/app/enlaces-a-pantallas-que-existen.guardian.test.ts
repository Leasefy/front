/**
 * 🔴 GUARDIÁN: NINGÚN ENLACE LLEVA A UNA PANTALLA QUE NO EXISTE.
 *
 * ── De dónde sale ──────────────────────────────────────────────────────────
 *
 * 22-09, barriendo `/onboarding/inquilino` con el navegador abierto: la red
 * mostró un `404 GET /auth/login?redirect=%2Finquilino`. Era el enlace
 * «¿Ya tienes cuenta? Inicia sesión» de la bienvenida del inquilino, y estaba
 * mal dos veces: `/auth/login` no existe —la pantalla es `/auth`— y el
 * parámetro es `returnUrl`, no `redirect`, así que aun llegando no volvía.
 *
 * Lo que lo vuelve una CLASE y no un descuido: el mismo error ya se había
 * arreglado en `FalloDeCarga.tsx`, y ahí quedó el comentario —«`/auth`, no
 * `/auth/login` — esa ruta no existe»— pero no se barrió el resto del
 * producto. Un arreglo que no barre deja a los hermanos vivos.
 *
 * ── Qué mira, y qué NO ─────────────────────────────────────────────────────
 *
 * Los enlaces con camino LITERAL: `href="/x"`, `router.push('/x')`,
 * `redirect('/x')`. Los que se arman con plantilla (`href={\`/x/${id}\`}`) no
 * se pueden juzgar desde acá y no se cuentan — por eso la prueba de abajo dice
 * cuántos miró: un barrido que no dice su alcance miente por omisión.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'src';
const APP = 'src/app';

/** Las rutas que el App Router declara, con `*` en los segmentos dinámicos. */
function rutasDeclaradas(d: string, prefijo = '', out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (!statSync(p).isDirectory()) {
      if (e === 'page.tsx' || e === 'route.ts') out.push(prefijo === '' ? '/' : prefijo);
      continue;
    }
    if (e.startsWith('_')) continue;
    // `(grupo)` no aparece en la URL; `[x]` es un comodín.
    const seg = /^\(.*\)$/.test(e) ? '' : /^\[.*\]$/.test(e) ? '/*' : `/${e}`;
    rutasDeclaradas(p, prefijo + seg, out);
  }
  return out;
}

const DECLARADAS = rutasDeclaradas(APP).map((r) => r.split('/'));

function atiende(camino: string): boolean {
  const trozos = camino.split('/');
  return DECLARADAS.some(
    (t) => t.length === trozos.length && t.every((s, i) => s === '*' || s === trozos[i]),
  );
}

const esPrueba = (p: string) =>
  /\.test\.tsx?$|\.spec\.tsx?$|__tests__|\/tests\//.test(p);

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** No son pantallas: la API de Next, los estáticos y cualquier archivo. */
const NO_ES_PANTALLA = (c: string) =>
  /^\/(api|_next|images|img|fonts|videos|assets|favicon|logos)(\/|$)/.test(c) ||
  /\.[a-z0-9]{2,5}$/i.test(c);

export function enlacesLiterales(): { rotos: Map<string, string[]>; mirados: number } {
  const rotos = new Map<string, string[]>();
  let mirados = 0;
  const patrones = [
    /href="(\/[^"?#${}]*)/g,
    /href='(\/[^'?#${}]*)/g,
    /router\.(?:push|replace)\(\s*['"](\/[^'"?#${}]*)/g,
    /redirect\(\s*['"](\/[^'"?#${}]*)/g,
  ];
  for (const p of archivos(RAIZ)) {
    if (esPrueba(p)) continue;
    const texto = readFileSync(p, 'utf8');
    for (const re of patrones) {
      for (const m of texto.matchAll(re)) {
        const camino = m[1].replace(/\/+$/, '') || '/';
        mirados++;
        if (NO_ES_PANTALLA(camino) || atiende(camino)) continue;
        if (!rotos.has(camino)) rotos.set(camino, []);
        rotos.get(camino)!.push(p);
      }
    }
  }
  return { rotos, mirados };
}

describe('🔴 ningún enlace lleva a una pantalla que no existe', () => {
  it('todo camino literal tiene su `page.tsx`', () => {
    const { rotos } = enlacesLiterales();
    const lista = [...rotos]
      .map(([c, d]) => `${c}   (${[...new Set(d)].join(', ')})`)
      .sort();
    expect(
      lista,
      'Estos enlaces llevan a pantallas que no existen: son un 404 para quien\n' +
        `los siga.\n\n  ${lista.join('\n  ')}\n`,
    ).toEqual([]);
  });

  /** Un barrido roto no puede pasar en verde para siempre. */
  it('el barrido mira rutas y enlaces de verdad', () => {
    const { mirados } = enlacesLiterales();
    expect(DECLARADAS.length).toBeGreaterThan(300);
    expect(mirados).toBeGreaterThan(300);
  });
});
