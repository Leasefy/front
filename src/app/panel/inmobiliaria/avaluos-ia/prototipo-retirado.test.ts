/**
 * avaluos-ia — lo que quedaba del prototipo se retiró ENTERO (ARREGLOS-8,
 * MOV-A2 Q2 a, 03-10-2026).
 *
 * `enviar` y `monitoreo` ya redirigían (`rutas-retiradas.test.ts`), pero
 * `[id]`, `conexiones`, `nuevo` y `venta` seguían vivas por URL directa, con el
 * rótulo de «datos de ejemplo» encima y enlaces entre ellas: el «resultado»
 * mandaba a `enviar`, `nuevo` mandaba a un `r1` inventado. Ahora todas van al
 * módulo real, como el índice de la carpeta.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: 'r1' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria/avaluos-ia',
}));

import Resultado from './[id]/page';
import Conexiones from './conexiones/page';
import Nuevo from './nuevo/page';
import Venta from './venta/page';

const DESTINO = '/panel/inmobiliaria/inmuebles/avaluos';
const CARPETA = join(process.cwd(), 'src/app/panel/inmobiliaria/avaluos-ia');

function adondeVa(Pagina: () => unknown): unknown {
  redirectMock.mockClear();
  try {
    Pagina();
  } catch {
    // Una pantalla del prototipo (componente cliente con hooks) revienta fuera de React.
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

describe('avaluos-ia — ninguna pantalla del prototipo queda viva', () => {
  it.each([
    ['/avaluos-ia/[id]', Resultado],
    ['/avaluos-ia/conexiones', Conexiones],
    ['/avaluos-ia/nuevo', Nuevo],
    ['/avaluos-ia/venta', Venta],
  ] as const)('🔴 %s redirige al módulo real de avalúos', (_ruta, Pagina) => {
    expect(adondeVa(Pagina as () => unknown)).toBe(DESTINO);
  });

  it('🔴 en la carpeta no queda ninguna pantalla del prototipo ni su rótulo', () => {
    const vivos = archivos(CARPETA)
      .filter((p) => !/\.test\.tsx?$/.test(p))
      .map((p) => relative(CARPETA, p))
      .filter((p) => {
        if (!p.endsWith('page.tsx')) return true;
        const s = readFileSync(join(CARPETA, p), 'utf8');
        return s.includes("'use client'") || !s.includes(`redirect('${DESTINO}')`);
      });
    expect(vivos).toEqual([]);
  });
});
