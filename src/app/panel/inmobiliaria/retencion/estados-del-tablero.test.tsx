/**
 * Retención — un tablero caído no puede decir «No hay casos urgentes 🎉».
 *
 * Con la consulta rota, la pantalla afirmaba «Sin datos de portafolio
 * todavía» y «No hay casos urgentes ahora mismo 🎉» —tranquilizando justo
 * cuando no sabía nada— y el fallo quedaba en un cartel rojo al fondo, con el
 * mensaje crudo y sin reintentar. Ahora el orden es cargando → falló → vacío →
 * datos (`EstadoDeDatos`), y el vacío sólo se dice cuando la respuesta llegó.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { dashboardMock } = vi.hoisted(() => ({ dashboardMock: vi.fn() }));

vi.mock('@/lib/hooks/retencion/use-retencion', () => ({
  useRetencionDashboard: dashboardMock,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

import RetencionDashboardPage from './page';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  dashboardMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(estado: Record<string, unknown>) {
  dashboardMock.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    usingMock: false,
    refetch: vi.fn(),
    ...estado,
  });
  act(() => root.render(<RetencionDashboardPage />));
}

describe('Retención — tablero: cargando → falló → vacío → datos (C32)', () => {
  it('🔴 con la consulta caída no afirma vacíos: pinta el fallo y deja reintentar', async () => {
    const refetch = vi.fn();
    render({ error: 'Failed to fetch', refetch });

    const fallo = container.querySelector('[data-testid="fallo-de-carga"]');
    expect(fallo).not.toBeNull();
    expect(container.textContent).not.toContain('Sin datos de portafolio');
    expect(container.textContent).not.toContain('No hay casos urgentes');
    expect(container.textContent).not.toContain('No pude cargar el dashboard');

    const reintentar = container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]');
    expect(reintentar).not.toBeNull();
    await act(async () => {
      reintentar!.click();
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('con un 403 no ofrece reintentar', () => {
    render({ error: '403' });
    expect(container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-tipo')).toBe(
      'sinPermiso',
    );
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull();
  });

  it('mientras carga muestra el esqueleto y ningún vacío', () => {
    render({ isLoading: true });
    expect(container.querySelector('[data-testid="retencion-cargando"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Sin datos de portafolio');
    expect(container.textContent).not.toContain('No hay casos urgentes');
  });

  it('con la respuesta vacía (y sin error) sí dice que no hay datos', () => {
    render({ data: { cards: [], urgent: [] } });
    expect(container.textContent).toContain('Sin datos de portafolio');
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
  });

  it('con indicadores y sin urgentes, el «no hay casos urgentes» es verdad y se dice', () => {
    render({
      data: { cards: [{ key: 'propietarios_riesgo', label: 'Propietarios en riesgo', value: '0' }], urgent: [] },
    });
    expect(container.textContent).toContain('Propietarios en riesgo');
    expect(container.textContent).toContain('No hay casos urgentes');
  });
});
