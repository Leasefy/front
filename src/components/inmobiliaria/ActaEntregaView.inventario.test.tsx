/**
 * El inventario del inmueble se puede cargar (2026-09-02). Antes los tres
 * botones venían `disabled` con «Próximamente» y no había forma de agregar
 * nada: Nico preguntó si «no estaba construido». Acá se fija lo que importa:
 * con handlers, los botones existen y llaman; sin handlers, la vista es de
 * sólo lectura y no promete nada.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatDate: (d: string) => d }),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  motion: {
    tr: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: React.ComponentProps<'tr'> & Record<string, unknown>) =>
      React.createElement('tr', props, children),
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
  },
}));

import { ActaEntregaView } from './ActaEntregaView';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

const items: InventoryItem[] = [
  { id: 'a', name: 'Nevera', quantity: 1, condition: 'good' },
  { id: 'b', name: 'Cortinas', quantity: 4, condition: 'fair', notes: 'Una rota' },
];

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

describe('ActaEntregaView — inventario editable', () => {
  it('vacío y con onAddItem: el botón «Agregar inventario» está vivo y llama', () => {
    const onAddItem = vi.fn();
    act(() => {
      root.render(
        React.createElement(ActaEntregaView, { inventoryItems: [], contractDate: '2026-09-01', onAddItem }),
      );
    });
    const boton = container.querySelector<HTMLButtonElement>('[data-testid="inventario-agregar"]');
    expect(boton).not.toBeNull();
    expect(boton!.disabled).toBe(false);
    act(() => boton!.click());
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it('con ítems: editar y quitar entregan el ítem exacto', () => {
    const onEditItem = vi.fn();
    const onDeleteItem = vi.fn();
    act(() => {
      root.render(
        React.createElement(ActaEntregaView, {
          inventoryItems: items,
          contractDate: '2026-09-01',
          onAddItem: () => {},
          onEditItem,
          onDeleteItem,
        }),
      );
    });
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="inventario-editar-b"]')!.click());
    expect(onEditItem).toHaveBeenCalledWith(items[1]);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="inventario-quitar-a"]')!.click());
    expect(onDeleteItem).toHaveBeenCalledWith(items[0]);
    expect(container.querySelector('[data-testid="inventario-agregar-item"]')).not.toBeNull();
  });

  it('sin handlers es de sólo lectura: ningún botón de agregar, editar ni quitar', () => {
    act(() => {
      root.render(React.createElement(ActaEntregaView, { inventoryItems: items, contractDate: '2026-09-01' }));
    });
    expect(container.querySelector('[data-testid="inventario-agregar-item"]')).toBeNull();
    expect(container.querySelector('[data-testid^="inventario-editar-"]')).toBeNull();
    expect(container.querySelector('[data-testid^="inventario-quitar-"]')).toBeNull();
  });
});
