/**
 * 🔴 N-39 (QA-PAGOS-95 r2, 06-10-2026): Dispersiones de octubre pintaba
 * «−$ 3.269.000» en la fila de Tomás (deducciones mayores que su mes: no se le
 * gira nada y lo demás queda en contra) y el «Total» del pie lo restaba:
 * $ 5.594.500 junto a «A dispersar $ 8.863.500». Ahora la fila dice lo que se
 * gira ($ 0) y lo que queda en contra, y el pie suma lo que se gira.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion, DispersionItem } from '@/lib/types/inmobiliaria';

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

import { DispersionTable } from './DispersionTable';

function linea(overrides: Partial<DispersionItem> = {}): DispersionItem {
  return {
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
    ...overrides,
  };
}

function dispersion(overrides: Partial<Dispersion> = {}): Dispersion {
  return {
    id: 'd-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    propietarioBankAccount: null,
    month: '2026-09',
    items: [linea()],
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

function pintar(elemento: React.ReactElement) {
  act(() => {
    root.render(elemento);
  });
}



const TOMAS = {
  netoDelMesCop: 881_000,
  deducciones: [],
  deduccionesCop: 4_150_000,
  saldoAnteriorCop: 0,
  netoCop: -3_269_000,
  aGirarCop: 0,
  saldoEnContraCop: 3_269_000,
  compensadoCop: 881_000,
  renglones: [],
} as unknown as NonNullable<Dispersion['conDeducciones']>;

describe('N-39 · Dispersiones: lo que se gira, nunca un negativo', () => {
  it('🔴 la fila con deducciones mayores que el mes dice $ 0 y lo que queda en contra', () => {
    pintar(
      <DispersionTable
        dispersiones={[dispersion({ id: 't', propietarioName: 'Tomás', netToPropietario: -3_269_000, conDeducciones: TOMAS })]}
      />,
    );
    expect(host.textContent).not.toMatch(/-\s*\$|−\s*\$|\$\s*-/);
    expect(host.querySelector('[data-testid="dispersion-en-contra"]')?.textContent).toMatch(/3\.?269\.?000 en contra: pasa a la próxima liquidación/);
  });

  it('🔴 el «Total» suma lo que se gira ($ 8.863.500), no resta el en contra', () => {
    pintar(
      <DispersionTable
        showSummary
        dispersiones={[
          dispersion({ id: 'o', propietarioName: 'Olga', netToPropietario: 7_742_000 }),
          dispersion({ id: 'r', propietarioName: 'Rentas', netToPropietario: 1_121_500 }),
          dispersion({ id: 't', propietarioName: 'Tomás', netToPropietario: -3_269_000, conDeducciones: TOMAS }),
        ]}
      />,
    );
    const pie = host.querySelector('tfoot')?.textContent ?? '';
    // (El stub de i18n pinta la plata sin puntos.)
    expect(pie).toMatch(/8\.?863\.?500/);
    expect(pie).not.toMatch(/5\.?594\.?500/);
  });
});
