/**
 * Tres tarjetas del panel que dividían por cero con la inmobiliaria en cero:
 *
 *   · Dispersiones  — «0%» de avance sobre cero dispersiones.
 *   · Dona de estados (Desempeño IA) — «0%» en las cinco filas de la leyenda.
 *   · Carga de agentes — «0.0» de promedio sin un solo agente activo.
 *
 * En los tres el 0 se leía como una medición. Va la raya de Conciliación.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { AgenteWorkloadChart } from './AgenteWorkloadChart';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { DispersionResumen, DispersionResumenCompact } from './DispersionResumen';
import type {
  AnalyticsChart,
  AnalyticsData,
  DispersionSummary,
} from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar(nodo: React.ReactNode) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(nodo);
  });
}

function texto(testid: string): string {
  const el = document.querySelector(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`No se pintó [data-testid="${testid}"]`);
  return el.textContent?.trim() ?? '';
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

// ── Dispersiones ─────────────────────────────────────────────────────────────

function dispersiones(sobre: Partial<DispersionSummary> = {}): DispersionSummary {
  return {
    month: '2026-09',
    totalToDisburse: 0,
    totalCommissions: 0,
    dispersionsPending: 0,
    dispersionsCompleted: 0,
    dispersionsFailed: 0,
    ...sobre,
  };
}

describe('DispersionResumen — un mes sin dispersiones', () => {
  it('el avance es una raya, no «0»', async () => {
    await montar(<DispersionResumen summary={dispersiones()} />);
    expect(texto('dispersiones-avance')).toBe('—');
  });

  it('con dispersiones de verdad mide el avance', async () => {
    await montar(
      <DispersionResumen
        summary={dispersiones({ dispersionsCompleted: 3, dispersionsPending: 1 })}
      />,
    );
    expect(texto('dispersiones-avance')).toBe('75');
  });

  it('un avance MEDIDO en cero sigue siendo 0%: hay 4 pendientes y ninguna salió', async () => {
    await montar(<DispersionResumen summary={dispersiones({ dispersionsPending: 4 })} />);
    expect(texto('dispersiones-avance')).toBe('0');
  });

  it('la variante compacta también pinta la raya', async () => {
    await montar(<DispersionResumenCompact summary={dispersiones()} />);
    expect(texto('dispersiones-avance-compacto')).toBe('—');
  });
});

// ── Dona de estados ──────────────────────────────────────────────────────────

function dona(data: number[]): AnalyticsData {
  const chart: AnalyticsChart = {
    id: 'estados',
    title: 'Estado de la cartera',
    type: 'donut',
    labels: ['Al día', 'En mora'],
    datasets: [{ label: 'Estados', data, color: '#1A40FF' }],
    period: 'month',
  };
  return { kpis: [], charts: [chart] } as unknown as AnalyticsData;
}

describe('Dona de estados — todo en cero', () => {
  it('el número del centro es una raya, no «0%»', async () => {
    await montar(<AnalyticsDashboard data={dona([0, 0])} />);
    expect(texto('dona-al-dia')).toBe('—');
  });

  it('la leyenda no repite «0%» en cada fila', async () => {
    await montar(<AnalyticsDashboard data={dona([0, 0])} />);
    expect(document.body.textContent).not.toContain('0%');
    expect(document.body.textContent).toContain('—');
  });

  it('con datos reparte de verdad', async () => {
    await montar(<AnalyticsDashboard data={dona([75, 25])} />);
    expect(texto('dona-al-dia')).toBe('75%');
    expect(document.body.textContent).toContain('25%');
  });
});

// ── Carga de agentes ─────────────────────────────────────────────────────────

describe('AgenteWorkloadChart — sin agentes activos', () => {
  it('el promedio es una raya, no «0.0»', async () => {
    await montar(<AgenteWorkloadChart agentes={[]} />);
    expect(texto('carga-promedio')).toBe('—');
  });
});
