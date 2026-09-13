/**
 * Los tres puntos del detalle de un mantenimiento.
 *
 * Nico, 2026-09-12: «en el detalle, en los tres puntos, en el menú, no deja
 * agregar la cotización a un mantenimiento ya creado».
 *
 * 🔴 El detalle NO TENÍA menú: ni el botón de los tres puntos existía en el
 * cajón. Lo que fija esta prueba es que el menú está, que ofrece «Agregar
 * cotización» y que desaparece entero cuando la solicitud ya está cerrada —un
 * menú que ofrece cotizar un trabajo terminado es la misma promesa rota que el
 * botón que contestaba «función en desarrollo».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
  }),
}));

import { MantenimientoViewer } from './MantenimientoViewer';

function hacerSolicitud(
  overrides: Partial<SolicitudMantenimiento> = {},
): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'reported',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

const menu = () =>
  document.body.querySelector<HTMLButtonElement>('[data-testid="mantenimiento-detalle-menu"]');

/**
 * El disparador de Radix abre con `pointerdown`, no con `click`: un `.click()`
 * pelado no dibuja nunca los ítems del portal.
 */
async function abrirMenu() {
  await act(async () => {
    menu()!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
    );
    await new Promise((r) => setTimeout(r, 0));
  });
}

function montar(props: Partial<React.ComponentProps<typeof MantenimientoViewer>> = {}) {
  const onRequestQuote =
    'onRequestQuote' in props ? props.onRequestQuote : vi.fn();
  const onStatusChange = 'onStatusChange' in props ? props.onStatusChange : vi.fn();
  act(() => {
    root.render(
      <MantenimientoViewer
        solicitud={props.solicitud ?? hacerSolicitud()}
        isOpen
        onClose={props.onClose ?? vi.fn()}
        onRequestQuote={onRequestQuote}
        onStatusChange={onStatusChange}
        onApproveQuote={vi.fn()}
      />,
    );
  });
  return { onRequestQuote: onRequestQuote as ReturnType<typeof vi.fn> };
}

describe('<MantenimientoViewer> — los tres puntos del detalle', () => {
  it('el botón de los tres puntos existe (antes no había menú ninguno)', () => {
    montar();
    expect(menu()).not.toBeNull();
    expect(menu()!.getAttribute('aria-label')).toBe('inmobiliaria.mantenimiento.moreActions');
  });

  it('abre el menú y ofrece «Agregar cotización»', async () => {
    montar();
    await abrirMenu();
    const item = document.body.querySelector('[data-testid="mantenimiento-detalle-cotizar"]');
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain('inmobiliaria.mantenimiento.addQuote');
  });

  it('elegir «Agregar cotización» avisa con el id de ESTA solicitud', async () => {
    const { onRequestQuote } = montar({ solicitud: hacerSolicitud({ id: 'sol-42' }) });
    await abrirMenu();
    await act(async () => {
      document.body
        .querySelector<HTMLElement>('[data-testid="mantenimiento-detalle-cotizar"]')!
        .click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onRequestQuote).toHaveBeenCalledWith('sol-42');
  });

  it.each(['completed', 'cancelled'] as const)(
    'una solicitud %s no muestra menú: no queda nada que hacerle',
    (status) => {
      montar({ solicitud: hacerSolicitud({ status }) });
      expect(menu()).toBeNull();
    },
  );

  it('sin quien atienda la cotización, esa entrada no se ofrece', async () => {
    montar({ onRequestQuote: undefined });
    // Queda «Cancelar solicitud», así que el menú sigue existiendo.
    await abrirMenu();
    expect(
      document.body.querySelector('[data-testid="mantenimiento-detalle-cotizar"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-testid="mantenimiento-detalle-cancelar"]'),
    ).not.toBeNull();
  });

  it('sin handlers no hay menú en absoluto', () => {
    montar({ onRequestQuote: undefined, onStatusChange: undefined });
    expect(menu()).toBeNull();
  });
});
