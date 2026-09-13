/**
 * El inventario de un inmueble, montado igual desde la ficha del inmueble y
 * desde la del contrato.
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Lo que se cuida acá: que con permiso
 * esté TODO (agregar, editar, quitar, la barra del borrador, el diálogo), que
 * sin permiso no haya NADA de eso —y tampoco la barra, que no tendría qué
 * subir—, y que el vacío ofrezca el botón ahí mismo en vez de mandar a otra
 * pantalla.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { borradorMock, opcionesDelBorrador, pushMock } = vi.hoisted(() => ({
  borradorMock: {
    items: [] as unknown[],
    vistasPrevias: {} as Record<string, string>,
    hayPendientes: false,
    actualizadoEn: null as number | null,
    fotosSinSubir: 0,
    senal: true as boolean | null,
    subiendo: false,
    avance: null,
    errorDeSubida: null as string | null,
    guardarItem: vi.fn(() => Promise.resolve()),
    quitarItem: vi.fn(() => Promise.resolve()),
    subir: vi.fn(() => Promise.resolve()),
    descartar: vi.fn(() => Promise.resolve()),
  },
  opcionesDelBorrador: { ultimo: null as Record<string, unknown> | null },
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatDate: (d: string) => d }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  motion: {
    tr: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: React.ComponentProps<'tr'> & Record<string, unknown>) =>
      React.createElement('tr', props, children),
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
  },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/hooks/use-borrador-de-inventario', () => ({
  useBorradorDeInventario: (opciones: Record<string, unknown>) => {
    opcionesDelBorrador.ultimo = opciones;
    return borradorMock;
  },
}));

import { InventarioDeLaConsignacion } from './InventarioDeLaConsignacion';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

const ITEMS: InventoryItem[] = [
  { id: 'it-1', name: 'Nevera', quantity: 1, condition: 'good' },
];

const CONSIGNACION = { id: 'cons-1', contractDate: '2026-01-15', inventoryItems: ITEMS };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  borradorMock.items = ITEMS;
  borradorMock.vistasPrevias = {};
  borradorMock.hayPendientes = false;
  borradorMock.guardarItem.mockClear();
  borradorMock.quitarItem.mockClear();
  pushMock.mockClear();
  opcionesDelBorrador.ultimo = null;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(props: Partial<React.ComponentProps<typeof InventarioDeLaConsignacion>> = {}) {
  await act(async () => {
    root.render(
      React.createElement(InventarioDeLaConsignacion, {
        consignacion: CONSIGNACION,
        puedeEditar: true,
        ...props,
      }),
    );
  });
}

describe('<InventarioDeLaConsignacion>', () => {
  it('el borrador se llavea por la CONSIGNACIÓN y anota desde qué contrato se abrió', async () => {
    await render({ contratoId: 'lease-9' });

    expect(opcionesDelBorrador.ultimo).toMatchObject({
      consignacionId: 'cons-1',
      itemsDelBack: ITEMS,
      contratoId: 'lease-9',
    });
  });

  it('con permiso: agregar, editar y quitar están vivos', async () => {
    await render();

    expect(container.querySelector('[data-testid="inventario-agregar-item"]')).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="inventario-quitar-it-1"]')!.click();
    });
    expect(borradorMock.quitarItem).toHaveBeenCalledWith(ITEMS[0]);
  });

  it('sin permiso: sólo lectura, y tampoco la barra del borrador', async () => {
    borradorMock.hayPendientes = true;
    await render({ puedeEditar: false });

    expect(container.querySelector('[data-testid="inventario-agregar-item"]')).toBeNull();
    expect(container.querySelector('[data-testid^="inventario-editar-"]')).toBeNull();
    expect(container.querySelector('[data-testid^="inventario-quitar-"]')).toBeNull();
    expect(container.querySelector('[data-testid="borrador-de-inventario"]')).toBeNull();
  });

  /*
   * El vacío que Nico vio desde el contrato decía «Agrega ítems al inventario
   * del inmueble» y mandaba a otra pantalla. Un vacío honesto ofrece el botón
   * donde está la persona.
   */
  it('vacío y con permiso: el botón de agregar está ahí mismo', async () => {
    borradorMock.items = [];
    await render({ consignacion: { ...CONSIGNACION, inventoryItems: [] } });

    expect(container.querySelector('[data-testid="inventario-agregar"]')).not.toBeNull();
  });

  it('vacío y sin permiso: no promete un botón que no hay', async () => {
    borradorMock.items = [];
    await render({ consignacion: { ...CONSIGNACION, inventoryItems: [] }, puedeEditar: false });

    expect(container.querySelector('[data-testid="inventario-agregar"]')).toBeNull();
  });

  /*
   * El pedido de Nico es este: que desde el contrato se pueda AGREGAR. El
   * diálogo es el mismo de la ficha del inmueble —la cámara incluida—, así que
   * lo que hay que probar es que el botón lo abra.
   */
  it('agregar abre el diálogo del ítem, el mismo de la ficha del inmueble', async () => {
    await render({ contratoId: 'lease-9' });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="inventario-agregar-item"]')!.click();
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('imprimir abre la hoja del acta del inmueble, se haya entrado por donde se haya entrado', async () => {
    await render({ contratoId: 'lease-9' });

    const imprimir = container.querySelector<HTMLButtonElement>(
      '[aria-label="inmobiliaria.acta.print"]',
    );
    await act(async () => imprimir!.click());
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles/cons-1/acta');
  });

  it('«Preparar para trabajar sin señal» sólo aparece cuando hay copia local que preparar', async () => {
    await render();
    expect(container.querySelector('[data-testid="preparar-sin-senal"]')).toBeNull();

    const preparar = vi.fn(() => Promise.resolve(true));
    await render({
      copiaLocal: {
        copia: null,
        guardadoEn: null,
        preparando: false,
        ultimaPreparacion: null,
        preparar,
      },
    });
    expect(container.querySelector('[data-testid="preparar-sin-senal"]')).not.toBeNull();
  });
});
