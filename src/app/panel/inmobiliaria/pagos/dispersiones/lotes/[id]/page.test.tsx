/**
 * @vitest-environment happy-dom
 *
 * Un lote sin id no deja la página en blanco: dice que no existe y lleva a Lotes.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const params = vi.fn();
vi.mock('next/navigation', () => ({ useParams: () => params() }));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/components/dispersiones/lotes/DetalleDelLote', () => ({
  DetalleDelLote: ({ id }: { id: string }) =>
    React.createElement('div', { 'data-testid': 'detalle-del-lote' }, id),
}));

import LoteDeDispersionPage from './page';

let host: HTMLDivElement;
let root: Root;

function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<LoteDeDispersionPage />));
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('lotes/[id]', () => {
  it('con id monta el detalle del lote', () => {
    params.mockReturnValue({ id: 'lote-1' });
    montar();
    expect(host.querySelector('[data-testid="detalle-del-lote"]')?.textContent).toBe('lote-1');
  });

  it('sin id: «no existe», sin reintentar y con la vuelta a Lotes — no una página en blanco', () => {
    params.mockReturnValue({ id: '' });
    montar();
    const fallo = host.querySelector('[data-testid="fallo-de-carga"]');
    expect(fallo?.getAttribute('data-tipo')).toBe('noExiste');
    expect(host.querySelector('[data-testid="reintentar"]')).toBeNull();
    const volver = fallo?.querySelector('a');
    expect(volver?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/dispersiones/lotes');
    expect(volver?.textContent).toContain('Volver a Lotes');
  });
});
