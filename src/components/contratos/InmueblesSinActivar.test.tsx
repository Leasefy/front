/**
 * InmueblesSinActivar.test.tsx
 *
 * 🔴 El aviso que faltó durante cuatro rondas (2026-09-10).
 *
 * Nico veía cientos de contratos con «el código del inmueble no existe»,
 * abría su Excel y el inmueble estaba ahí, con ese código y esa dirección. El
 * producto le decía que su archivo estaba corrido. No lo estaba: su inmueble
 * de código 3 vivía en la fila 2862 de su importación, en LISTO y con
 * `faltantes: []`, sin activar — porque el bucle de activación moría en la
 * fila 1532.
 *
 * Este aviso existe para que esa causa se vea, en vez de deducirse.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { lotesAbiertos: vi.fn() } }));

vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmuebles-importacion.service')
  >('@/lib/api/inmuebles-importacion.service');
  return {
    ...actual,
    inmueblesImportacionApi: { ...actual.inmueblesImportacionApi, ...api },
  };
});

import { InmueblesSinActivar } from './InmueblesSinActivar';

function lote(over: Record<string, unknown> = {}) {
  return {
    lote: 'lote-1',
    estado: 'LISTO',
    total: 2864,
    procesadas: 2864,
    pendientes: 243,
    listos: 1240,
    activados: 1381,
    descartados: 0,
    jobId: null,
    error: null,
    creadoEn: '2026-09-10T00:00:00.000Z',
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(nodo: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(nodo);
  });
  await act(async () => {});
}

const q = (t: string) => container.querySelector(`[data-testid="${t}"]`);

beforeEach(() => {
  api.lotesAbiertos.mockResolvedValue([lote()]);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('<InmueblesSinActivar>', () => {
  it('dice cuántos están listos y sin activar, con el número real', async () => {
    await pintar(<InmueblesSinActivar contratosSinInmueble={1192} />);
    const aviso = q('inmuebles-sin-activar');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('1.240');
    // Lo que hay que hacer, no sólo lo que pasa.
    expect(aviso?.textContent).toContain('Activarlos ahora');
  });

  it('cuenta los LISTO de TODOS los lotes abiertos, no sólo del último', async () => {
    api.lotesAbiertos.mockResolvedValue([
      lote({ lote: 'a', listos: 1240 }),
      lote({ lote: 'b', listos: 60 }),
    ]);
    await pintar(<InmueblesSinActivar />);
    expect(q('inmuebles-sin-activar')?.textContent).toContain('1.300');
  });

  it('NO cuenta las pendientes: ésas necesitan que alguien corrija algo', async () => {
    api.lotesAbiertos.mockResolvedValue([lote({ listos: 0, pendientes: 243 })]);
    await pintar(<InmueblesSinActivar />);
    expect(q('inmuebles-sin-activar')).toBeNull();
  });

  it('sin nada que activar no aparece: un aviso permanente deja de leerse', async () => {
    api.lotesAbiertos.mockResolvedValue([]);
    await pintar(<InmueblesSinActivar />);
    expect(q('inmuebles-sin-activar')).toBeNull();
  });

  it('si la consulta falla no grita: es una ayuda, no un dato del paso', async () => {
    api.lotesAbiertos.mockRejectedValue(new Error('red caída'));
    await pintar(<InmueblesSinActivar />);
    expect(q('inmuebles-sin-activar')).toBeNull();
    expect(container.textContent).not.toContain('red caída');
  });

  it('un solo inmueble se dice en singular', async () => {
    api.lotesAbiertos.mockResolvedValue([lote({ listos: 1 })]);
    await pintar(<InmueblesSinActivar />);
    expect(q('inmuebles-sin-activar')?.textContent).toContain(
      '1 inmueble preparado',
    );
  });
});
