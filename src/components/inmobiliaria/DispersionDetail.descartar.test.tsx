/**
 * El cajón de la dispersión — «Descartar» una liquidación borrador (Nico,
 * 13-10-2026: «octubre en el sistema anterior, Leasefy desde noviembre»; si ya
 * se habían generado las de octubre, no había cómo sacarlas).
 *
 * El cajón sólo la ofrece en una PENDIENTE y no pregunta él: le pasa la
 * liquidación a la página, que confirma y llama al back.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion } from '@/lib/types/inmobiliaria';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void whileHover; void whileTap; void initial; void animate; void exit; void transition;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/components/ui/sheet', async () => ({
  // Las piezas del cajón (cabecera con título y acciones, cuerpo, pie) como DOM plano.
  ...(await import('@/components/ui/sheet-test-stub')),
  Sheet: ({ children }: { children?: React.ReactNode }) => children,
  SheetContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [] }),
  useInmobiliariaConfig: () => ({ config: undefined }),
}));

import { DispersionDetail } from './DispersionDetail';

function dispersion(overrides: Partial<Dispersion> = {}): Dispersion {
  return {
    id: 'd-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    propietarioBankAccount: null,
    month: '2026-09',
    items: [
      {
        cobroId: null,
        cuotaId: 'cuota-1',
        propertyTitle: 'Apto 302 · Laureles',
        rentCollected: 2_000_000,
        commissionPercent: 10,
        commissionAmount: 200_000,
        netAmount: 1_800_000,
        conceptosAFavor: 0,
        conceptosACargo: 0,
        deTerceros: 0,
      },
    ],
    baseDelCanon: 'CAUSADO',
    totalCollected: 2_000_000,
    totalCommission: 200_000,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: 1_800_000,
    status: 'pending',
    createdAt: '2026-09-16',
    updatedAt: '2026-09-16',
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

function pintar(d: Dispersion, onDescartar?: (x: Dispersion) => void) {
  act(() => {
    root.render(<DispersionDetail isOpen onClose={() => {}} dispersion={d} onDescartar={onDescartar} />);
  });
}

describe('DispersionDetail — descartar una liquidación borrador', () => {
  it('en una pendiente ofrece «Descartar» y le pasa la liquidación a quien pregunta', () => {
    const onDescartar = vi.fn();
    const d = dispersion();
    pintar(d, onDescartar);

    const boton = q('dispersion-descartar') as HTMLButtonElement | null;
    expect(boton?.textContent?.trim()).toBe('Descartar');
    act(() => boton!.click());
    expect(onDescartar).toHaveBeenCalledWith(d);
  });

  it.each([['processing'], ['completed'], ['failed']] as const)(
    'en una %s no se ofrece: ya avanzó',
    (status) => {
      pintar(dispersion({ status }), vi.fn());
      expect(q('dispersion-descartar')).toBeNull();
    },
  );

  it('sin quien pregunte, no se ofrece', () => {
    pintar(dispersion());
    expect(q('dispersion-descartar')).toBeNull();
  });
});
