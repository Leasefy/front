/**
 * @vitest-environment happy-dom
 *
 * O1: Mi plata distingue una caída de un portal apagado. Antes un 500/403/red caía en
 * «Próximamente» y el propietario no tenía cómo saber que era un fallo ni reintentar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hook = vi.hoisted(() => ({
  valor: {} as Record<string, unknown>,
}));
vi.mock('@/lib/hooks/useOwnerPortal', () => ({ useOwnerFinanzas: () => hook.valor }));
vi.mock('@/components/ui', () => ({ Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }) }));
vi.mock('@/components/landlord/portal/PortalPlaceholder', () => ({
  PortalPlaceholder: () => React.createElement('div', { 'data-testid': 'proximamente' }),
}));
vi.mock('@/components/landlord/portal/finanzas/MiPlataView', () => ({
  MiPlataView: () => React.createElement('div', { 'data-testid': 'mi-plata' }),
}));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, onReintentar }: { error: { status: number }; onReintentar?: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga', 'data-status': String(error.status) },
      React.createElement('button', { 'data-testid': 'reintentar', onClick: onReintentar }, 'Reintentar'),
    ),
}));

import PortafolioPage from './page';

const base = {
  portafolio: null,
  inmuebles: [],
  proyeccion: null,
  recaudoAnual: null,
  isLoading: false,
  unavailable: false,
  fallo: null,
  reintentar: vi.fn(),
  agencyId: 'ag-1',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const pintar = (valor: Record<string, unknown>) => {
  hook.valor = { ...base, ...valor };
  act(() => root.render(<PortafolioPage />));
};

describe('Mi plata — cuatro estados (O1)', () => {
  it('🔴 una caída muestra el fallo con reintento, no «Próximamente»', () => {
    const reintentar = vi.fn();
    pintar({ fallo: { status: 500, mensaje: 'El portal respondió 500.' }, reintentar });

    expect(container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-status')).toBe('500');
    expect(container.querySelector('[data-testid="proximamente"]')).toBeNull();
    act(() => (container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement).click());
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it('con el portal apagado sigue siendo «Próximamente»', () => {
    pintar({ unavailable: true });
    expect(container.querySelector('[data-testid="proximamente"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
  });

  it('cargando muestra el spinner y con datos la vista', () => {
    pintar({ isLoading: true });
    expect(container.querySelector('[data-testid="spinner"]')).toBeTruthy();
    pintar({ portafolio: { totalCop: 1 } });
    expect(container.querySelector('[data-testid="mi-plata"]')).toBeTruthy();
  });
});
