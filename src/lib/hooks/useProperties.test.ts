/**
 * useProperties.test.ts — el buscador trae TODAS las páginas, no sólo la primera.
 *
 * El back pagina de a 100 como máximo y el hook pedía una sola página: con 155
 * propiedades publicadas, 55 quedaban inalcanzables y la pantalla anunciaba
 * «100 DISPONIBLES» como si ese fuera el total.
 *
 * Patrón tomado de use-address-autocomplete.test.ts (harness + createRoot).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

// Convención del repo (ver page.test.tsx de admin/arrendar): sin esto React
// avisa «not configured to support act(...)» en cada render.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { list: vi.fn() },
}));

import { propertiesApi } from '@/lib/api/properties.service';
import { useProperties } from './useProperties';

const listMock = propertiesApi.list as unknown as ReturnType<typeof vi.fn>;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  listMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
});

/** Una página de resultados falsa, con el `meta` que devuelve el back. */
function pagina(ids: string[], page: number, total: number, hasNext: boolean) {
  return {
    data: ids.map((id) => ({ id })),
    meta: { total, page, limit: 100, totalPages: Math.ceil(total / 100), hasNext, hasPrev: page > 1 },
  };
}

function TestHarness({ onResult }: { onResult: (r: ReturnType<typeof useProperties>) => void }) {
  const result = useProperties({});
  onResult(result);
  return null;
}

async function renderHook() {
  let latest!: ReturnType<typeof useProperties>;
  await act(async () => {
    root.render(React.createElement(TestHarness, { onResult: (r) => { latest = r; } }));
  });
  return { get current() { return latest; } };
}

describe('useProperties — paginación', () => {
  it('trae las 155 propiedades, no sólo las primeras 100', async () => {
    const primeras = Array.from({ length: 100 }, (_, i) => `p${i}`);
    const resto = Array.from({ length: 55 }, (_, i) => `p${100 + i}`);
    listMock
      .mockResolvedValueOnce(pagina(primeras, 1, 155, true))
      .mockResolvedValueOnce(pagina(resto, 2, 155, false));

    const hook = await renderHook();

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[1][0]).toMatchObject({ page: 2 });
    expect(hook.current.properties).toHaveLength(155);
    expect(hook.current.meta?.total).toBe(155);
  });

  it('no pide una segunda página cuando el back dice que no hay más', async () => {
    listMock.mockResolvedValueOnce(pagina(['a', 'b'], 1, 2, false));

    const hook = await renderHook();

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(hook.current.properties).toHaveLength(2);
  });

  it('deja `hasNext` en falso: lo que quedó en pantalla ya está completo', async () => {
    listMock
      .mockResolvedValueOnce(pagina(['a'], 1, 2, true))
      .mockResolvedValueOnce(pagina(['b'], 2, 2, false));

    const hook = await renderHook();

    expect(hook.current.meta?.hasNext).toBe(false);
    expect(hook.current.meta?.page).toBe(1);
  });

  it('si una página intermedia falla, conserva lo ya traído en vez de perderlo todo', async () => {
    listMock
      .mockResolvedValueOnce(pagina(['a', 'b'], 1, 155, true))
      .mockRejectedValueOnce(new Error('500'));

    const hook = await renderHook();

    expect(hook.current.properties).toHaveLength(2);
    expect(hook.current.error).toBeNull();
    expect(hook.current.meta?.total).toBe(155);
  });

  it('un fallo en la PRIMERA página sí se reporta como error', async () => {
    listMock.mockRejectedValueOnce(new Error('boom'));

    const hook = await renderHook();

    expect(hook.current.properties).toEqual([]);
    expect(hook.current.error).toBe('boom');
  });
});
