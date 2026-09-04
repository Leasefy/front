/**
 * AgenteSelector — lo que se ve cuando el equipo todavía no existe.
 *
 * En una agencia recién creada no hay agentes. La grilla quedaba con UNA
 * tarjeta («Sin agente asignado») apretada en una columna de tres, con el
 * texto cayendo palabra por palabra, debajo de dos filtros que decían
 * «0 agentes disponibles» (Nico lo vio, 2026-09-01). Ahí no hay nada que
 * elegir: se dice en una línea y listo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileHover: _h, whileTap: _t, ...props }: React.ComponentProps<'button'> & { whileHover?: unknown; whileTap?: unknown }) =>
      React.createElement('button', props, children),
    svg: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'svg'> & { initial?: unknown; animate?: unknown }) =>
      React.createElement('svg', props, children),
  },
}));

import { AgenteSelector } from './AgenteSelector';
import type { Agente } from '@/lib/types/inmobiliaria';

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

function render(agentes: Agente[]) {
  act(() => {
    root.render(React.createElement(AgenteSelector, { agentes, value: null, onChange: () => {}, allowNoAgent: true }));
  });
}

describe('<AgenteSelector> sin agentes', () => {
  it('con cero agentes activos no muestra filtros ni la tarjeta apretada: una sola línea', () => {
    render([]);

    expect(container.querySelector('[data-testid="agente-selector-sin-agentes"]')?.textContent).toBe(
      'inmobiliaria.agente.sinAgentesTodavia',
    );
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('availableAgentsPlural');
  });

  it('con un agente activo sí ofrece la grilla, con la opción de no asignar', () => {
    render([
      {
        id: 'a1', userId: 'u1', name: 'Ana Pérez', email: 'ana@x.co', phone: '', role: 'agent',
        status: 'active', commissionSplit: 50, assignedPropertyIds: [], hireDate: '2026-01-01',
        zone: 'Norte', metrics: { closedDeals: 0, avgDaysToClose: 0, conversionRate: 0, monthlyRevenue: 0 },
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
      } as unknown as Agente,
    ]);

    expect(container.querySelector('[data-testid="agente-selector-sin-agentes"]')).toBeNull();
    expect(container.textContent).toContain('Ana Pérez');
    expect(container.textContent).toContain('inmobiliaria.agente.noAgentAssigned');
  });
});
