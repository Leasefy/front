/**
 * PropietarioTable.test.tsx — el menú de cada fila hace lo que dice.
 *
 * QA en navegador, 2026-09-14: en la tabla de Propietarios, «Editar» y
 * «Eliminar» mandaban a la ficha del propietario en vez de abrir su diálogo.
 * El menú vive en un portal, pero el clic de un ítem sube por el árbol de
 * React hasta la fila (`onClick → onView`), que navega y desmonta la lista.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { FILTROS_INICIALES } from '@/lib/propietarios/filtrar-propietarios';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, initial, animate, exit, transition, whileHover, whileTap, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
}));

import { PropietarioTable } from './PropietarioTable';

const ALTAVISTA: Propietario = {
  id: 'prop-altavista',
  name: 'Constructora de prueba S.A.',
  email: 'pagos@ejemplo.co',
  phone: '6010000000',
  documentType: 'NIT',
  documentNumber: '900000000',
  propertyCount: 7,
  totalMonthlyRent: 25_900_000,
  pendingBalance: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Propietario;

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
  document.body.innerHTML = '';
});

function render() {
  const props = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onFiltros: vi.fn(),
  };
  act(() => {
    root.render(
      <PropietarioTable
        propietarios={[ALTAVISTA]}
        totalFiltrado={1}
        total={1}
        filtros={FILTROS_INICIALES}
        {...props}
      />,
    );
  });
  return props;
}

function elegirDelMenu(clave: string) {
  const trigger = container.querySelector('[aria-label="Acciones"]');
  expect(trigger).toBeTruthy();
  act(() => {
    (trigger as HTMLElement).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
    );
  });
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
    el.textContent?.includes(clave),
  );
  expect(item).toBeTruthy();
  act(() => {
    (item as HTMLElement).click();
  });
}

describe('<PropietarioTable> — el menú de la fila no abre la ficha por debajo', () => {
  it('«Eliminar» pide borrar y NO navega a la ficha', () => {
    const { onDelete, onView } = render();
    elegirDelMenu('inmobiliaria.propietario.table.delete');
    expect(onDelete).toHaveBeenCalledWith(ALTAVISTA);
    expect(onView).not.toHaveBeenCalled();
  });

  it('«Editar» abre la edición y NO navega a la ficha', () => {
    const { onEdit, onView } = render();
    elegirDelMenu('inmobiliaria.propietario.table.edit');
    expect(onEdit).toHaveBeenCalledWith(ALTAVISTA);
    expect(onView).not.toHaveBeenCalled();
  });

  it('«Ver detalle» sí abre la ficha, una sola vez', () => {
    const { onView } = render();
    elegirDelMenu('inmobiliaria.propietario.table.viewDetail');
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('un clic en la fila sigue abriendo la ficha', () => {
    const { onView } = render();
    act(() => {
      (container.querySelector('tbody tr') as HTMLElement).click();
    });
    expect(onView).toHaveBeenCalledWith(ALTAVISTA);
  });
});
