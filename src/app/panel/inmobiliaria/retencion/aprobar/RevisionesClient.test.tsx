/**
 * Revisiones de Retención — una cola caída no es «no hay decisiones».
 *
 * El vacío se evaluaba sin mirar el error: con la consulta rota la tabla decía
 * «No hay decisiones en este filtro» y, abajo, un cartel rojo con el mensaje
 * crudo y sin reintentar. Ahora el orden es cargando → falló → vacío → datos.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { decisionesMock } = vi.hoisted(() => ({ decisionesMock: vi.fn() }));

vi.mock('@/lib/hooks/retencion/use-decisiones', () => ({
  useDecisiones: decisionesMock,
  useReviewDecision: () => ({ review: vi.fn(), isReviewing: false }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import RevisionesClient from './RevisionesClient';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  decisionesMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(estado: Record<string, unknown>) {
  decisionesMock.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    usingMock: false,
    refetch: vi.fn(),
    ...estado,
  });
  act(() => root.render(<RevisionesClient />));
}

describe('Revisiones — cargando → falló → vacío → datos (C33)', () => {
  it('🔴 con la cola caída pinta el fallo, no «No hay decisiones en este filtro»', async () => {
    const refetch = vi.fn();
    render({ error: 'Failed to fetch', refetch });

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No hay decisiones en este filtro');
    expect(container.textContent).not.toContain('No pude cargar la cola de revisión');

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
    expect(container.querySelector('[data-testid="revisiones-cargando"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No hay decisiones en este filtro');
  });

  it('con la respuesta vacía (y sin error) sí dice que no hay decisiones', () => {
    render({ data: { decisions: [] } });
    expect(container.textContent).toContain('No hay decisiones en este filtro');
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull();
  });
});
