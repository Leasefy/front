/**
 * conciliacion-ia — el prototipo se retiró ENTERO (ARREGLOS-8, MOV-A2 Q2 a,
 * 03-10-2026).
 *
 * Sus nueve pantallas eran datos escritos a mano («Bancolombia ***4821», un
 * «77,5 %» de conciliación automática), sin un solo fetch, y duplicaban el árbol
 * real `/conciliacion`. Se enlazaban entre sí, así que retirar unas y dejar
 * otras dejaba enlaces que caían en la mitad del prototipo: cada una redirige
 * ahora a su par de verdad, y quien llegue por un enlace viejo no ve nada
 * inventado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// No relanza: en Next `redirect()` corta el render con una excepción, pero acá
// lo único que interesa es A DÓNDE manda.
const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  // Lo que importaban las pantallas del prototipo, por si alguna sigue viva.
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria/conciliacion-ia',
}));

import Portada from './page';
import Conexiones from './conexiones/page';
import Excepcion from './excepcion/page';
import Excepciones from './excepciones/page';
import Liquidaciones from './liquidaciones/page';
import Lote from './lote/page';
import Procesar from './procesar/page';
import Reglas from './reglas/page';
import Resultado from './resultado/page';

const REAL = '/panel/inmobiliaria/conciliacion';
const CARPETA = join(process.cwd(), 'src/app/panel/inmobiliaria/conciliacion-ia');

/** Llama la pantalla como lo haría Next. Una pantalla del prototipo (con hooks) revienta acá. */
function adondeVa(Pagina: () => unknown): unknown {
  redirectMock.mockClear();
  try {
    Pagina();
  } catch {
    // Un componente cliente llamado fuera de React lanza; lo que se mira es el redirect.
  }
  return redirectMock.mock.calls[0]?.[0];
}

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else out.push(p);
  }
  return out;
}

beforeEach(() => redirectMock.mockClear());

describe('conciliacion-ia — cada ruta vieja cae en su par del módulo real', () => {
  it.each([
    ['/conciliacion-ia', Portada, REAL],
    ['/conciliacion-ia/conexiones', Conexiones, `${REAL}/conexiones`],
    ['/conciliacion-ia/excepcion', Excepcion, `${REAL}/cola`],
    ['/conciliacion-ia/excepciones', Excepciones, `${REAL}/cola`],
    ['/conciliacion-ia/liquidaciones', Liquidaciones, `${REAL}/liquidaciones`],
    ['/conciliacion-ia/lote', Lote, `${REAL}/movimientos`],
    ['/conciliacion-ia/procesar', Procesar, REAL],
    ['/conciliacion-ia/reglas', Reglas, `${REAL}/configuracion`],
    ['/conciliacion-ia/resultado', Resultado, `${REAL}/analitica`],
  ] as const)('🔴 %s redirige a su par de verdad', (_ruta, Pagina, destino) => {
    expect(adondeVa(Pagina as () => unknown)).toBe(destino);
  });

  it('🔴 en la carpeta no queda ninguna pantalla del prototipo ni su rótulo', () => {
    const vivos = archivos(CARPETA)
      .filter((p) => !/\.test\.tsx?$/.test(p))
      .map((p) => relative(CARPETA, p))
      .filter((p) => {
        if (!p.endsWith('page.tsx')) return true; // un layout, un componente suelto…
        const s = readFileSync(join(CARPETA, p), 'utf8');
        return s.includes("'use client'") || !/\bredirect\(/.test(s);
      });
    expect(vivos).toEqual([]);
  });

  it('cada destino es una pantalla que existe en el módulo real', () => {
    const app = join(process.cwd(), 'src/app');
    for (const destino of [
      REAL,
      `${REAL}/conexiones`,
      `${REAL}/cola`,
      `${REAL}/liquidaciones`,
      `${REAL}/movimientos`,
      `${REAL}/configuracion`,
      `${REAL}/analitica`,
    ]) {
      expect(statSync(join(app, destino, 'page.tsx')).isFile(), destino).toBe(true);
    }
  });
});
