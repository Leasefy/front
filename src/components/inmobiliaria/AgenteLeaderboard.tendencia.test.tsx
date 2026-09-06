/**
 * La columna «Trend» del ranking de agentes no medía ninguna tendencia.
 *
 * `getMockTrend()` devolvía flecha verde arriba de 0.6 de conversión y flecha
 * roja debajo de 0.45 — un umbral sobre el MISMO `conversionRate` que la
 * columna de al lado ya muestra en porcentaje. Su propio comentario lo
 * admitía: «in production, this would compare against previous period». No
 * comparaba nada, pero en pantalla se leía como un movimiento en el tiempo,
 * junto al nombre y al puesto de una persona del equipo.
 *
 * `AgenteMetrics` no trae ningún dato del período anterior, así que no hay
 * tendencia que calcular: la celda queda en «—».
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));

import { AgenteLeaderboard } from './AgenteLeaderboard';
import type { Agente } from '@/lib/types/inmobiliaria';

void React;

function agente(nombre: string, conversionRate: number): Agente {
  return {
    id: `ag-${nombre}`,
    name: nombre,
    email: `${nombre}@example.com`,
    phone: '3001234567',
    role: 'agent',
    status: 'active',
    commissionSplit: 50,
    assignedPropertyIds: [],
    hireDate: '2025-01-01',
    metrics: {
      assignedProperties: 4,
      activeLeases: 2,
      closedThisMonth: 3,
      closedThisYear: 20,
      totalCommissions: 8_000_000,
      commissionsThisMonth: 1_000_000,
      avgDaysToClose: 21,
      conversionRate,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Agente;
}

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

function pintar(agentes: Agente[]) {
  act(() => {
    root.render(<AgenteLeaderboard agentes={agentes} />);
  });
}

const celdas = () => Array.from(container.querySelectorAll('[data-testid="agente-tendencia"]'));

describe('<AgenteLeaderboard> — tendencia', () => {
  it('no afirma tendencia para nadie, ni la buena ni la mala', () => {
    // Con el código viejo: la primera se llevaba flecha verde y la segunda
    // flecha roja, sin que nadie hubiera comparado dos períodos.
    pintar([agente('Sofía', 0.8), agente('Iván', 0.2)]);

    expect(celdas().length).toBe(2);
    for (const celda of celdas()) {
      expect(celda.textContent?.trim()).toBe('—');
    }
  });

  it('explica el vacío a quien lo lea con lector de pantalla', () => {
    pintar([agente('Sofía', 0.8)]);

    const etiqueta = celdas()[0]?.querySelector('[aria-label]')?.getAttribute('aria-label') ?? '';
    expect(etiqueta).toContain('período anterior');
  });

  it('la conversión real sigue en su columna: no se tiró lo bueno', () => {
    pintar([agente('Sofía', 0.8)]);
    expect(container.textContent).toContain('80%');
  });
});
