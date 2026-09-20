/**
 * `conversionRate` llega del back como PORCENTAJE (0–100), no como fracción.
 *
 * `agentes.service.ts` lo calcula `completados / leads * 100` con dos
 * decimales, y el ranking, la ficha del agente y el selector lo volvían a
 * multiplicar por 100: un agente con un cierre de tres leads salía «3333%», y
 * los umbrales de color (0.6, 0.4, 0.3) dejaban a todo el que tuviera un
 * cierre «por encima del promedio».
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));

import { AgenteLeaderboard } from './AgenteLeaderboard';
import { AgenteMetrics } from './AgenteMetrics';
import { AgenteSelector } from './AgenteSelector';
import type { Agente } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function agente(id: string, conversionRate: number): Agente {
  return {
    id,
    userId: `u-${id}`,
    name: `Agente ${id}`,
    email: `${id}@example.com`,
    phone: '3001234567',
    role: 'agent',
    status: 'active',
    commissionSplit: 50,
    assignedPropertyIds: [],
    hireDate: '2025-01-01',
    metrics: {
      assignedProperties: 1,
      activeLeases: 1,
      closedThisMonth: 1,
      closedThisYear: 1,
      totalCommissions: 1_000_000,
      commissionsThisMonth: 100_000,
      avgDaysToClose: 20,
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

function pintar(nodo: React.ReactNode) {
  act(() => {
    root.render(nodo);
  });
}

describe('conversionRate es un porcentaje', () => {
  it('ficha del agente: 33,33 se lee «33%», no «3333%»', () => {
    pintar(<AgenteMetrics metrics={agente('a', 33.33).metrics} />);
    expect(container.textContent).toContain('33%');
    expect(container.textContent).not.toContain('3333%');
  });

  it('ficha del agente: el color sale del porcentaje (65 arriba, 50 promedio, 20 abajo)', () => {
    const tarjetaDeConversion = () =>
      Array.from(container.querySelectorAll('div.rounded-lg')).find((d) =>
        d.textContent?.includes('%'),
      );

    pintar(<AgenteMetrics metrics={agente('a', 65).metrics} />);
    expect(tarjetaDeConversion()?.className).toContain('bg-success-soft');

    pintar(<AgenteMetrics metrics={agente('a', 50).metrics} />);
    expect(tarjetaDeConversion()?.className).not.toContain('bg-success-soft');
    expect(tarjetaDeConversion()?.className).not.toContain('bg-danger-soft');

    pintar(<AgenteMetrics metrics={agente('a', 20).metrics} />);
    expect(tarjetaDeConversion()?.className).toContain('bg-danger-soft');
  });

  it('ranking: la celda y el promedio del equipo no se multiplican otra vez', () => {
    pintar(<AgenteLeaderboard agentes={[agente('a', 50), agente('b', 25)]} />);
    const texto = container.textContent ?? '';
    expect(texto).toContain('50%');
    expect(texto).toContain('25%');
    // Promedio 37,5 → «38%».
    expect(texto).toContain('38%');
    expect(texto).not.toContain('5000%');
    expect(texto).not.toContain('3750%');
  });

  it('ranking: 45 % no es verde, 65 % sí', () => {
    pintar(<AgenteLeaderboard agentes={[agente('a', 65), agente('b', 45)]} />);
    const celda = (valor: string) =>
      Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent?.trim() === valor,
      );
    expect(celda('65%')?.className).toContain('text-success');
    expect(celda('45%')?.className).toContain('text-warning');
  });

  it('selector de agente: «40%», no «4000%»', () => {
    pintar(
      <AgenteSelector agentes={[agente('a', 40)]} value={null} onChange={() => {}} />,
    );
    expect(container.textContent).toContain('40%');
    expect(container.textContent).not.toContain('4000%');
  });
});
