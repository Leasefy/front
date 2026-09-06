/**
 * El resumen del negocio, con una inmobiliaria recién abierta.
 *
 * Sin un inmueble y sin un cobro esta pantalla decía «0.0%» de ocupación,
 * «0.0% tasa de cobro», «↗ +0% vs mes anterior» y «0 días» al cierre. Los
 * cuatro números salen de dividir por cero o de comparar contra un mes que
 * no existe. Van en raya, y la flecha desaparece.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { InmobiliariaDashboardKPIs } from '@/lib/types/inmobiliaria';

const { datos } = vi.hoisted(() => ({
  datos: { kpis: null as InmobiliariaDashboardKPIs | null },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaDashboard: () => ({
    kpis: datos.kpis,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useAgentes: () => ({ agentes: [] }),
  usePipelineItems: () => ({ pipelineItems: [] }),
  useCobros: () => ({ cobros: [] }),
  useMantenimientos: () => ({ mantenimientos: [] }),
}));

import DashboardPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Inmobiliaria nueva: cero inmuebles, cero cobros, cero cierres. */
function enCero(sobre: Partial<InmobiliariaDashboardKPIs> = {}): InmobiliariaDashboardKPIs {
  return {
    totalProperties: 0,
    propertiesAvailable: 0,
    propertiesRented: 0,
    propertiesInProcess: 0,
    occupancyRate: 0,
    expectedRevenue: 0,
    collectedRevenue: 0,
    pendingCollections: 0,
    lateCollections: 0,
    collectionRate: 0,
    totalCommissions: 0,
    collectionTrend: 0,
    commissionsTrend: 0,
    activeLeads: 0,
    scheduledVisits: 0,
    pendingApplications: 0,
    contractsInProgress: 0,
    totalAgents: 0,
    closedThisMonth: 0,
    avgDaysToClose: 0,
    totalPropietarios: 0,
    pendingDispersions: 0,
    ...sobre,
  } as InmobiliariaDashboardKPIs;
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<DashboardPage />);
  });
}

/** La tarjeta de KPI cuyo rótulo es `titulo`, entera. */
function tarjeta(titulo: string): HTMLElement {
  const rotulo = Array.from(document.querySelectorAll<HTMLElement>('span, div, p')).find(
    (el) => el.textContent?.trim() === titulo && el.children.length === 0,
  );
  const caja = rotulo?.closest('a, div.rounded-lg');
  if (!caja) throw new Error(`No se encontró la tarjeta «${titulo}»`);
  return caja as HTMLElement;
}

function texto(testid: string): string {
  const el = document.querySelector(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`No se pintó [data-testid="${testid}"]`);
  return el.textContent?.trim() ?? '';
}

beforeEach(() => {
  datos.kpis = enCero();
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

describe('Resumen del negocio — inmobiliaria en cero', () => {
  it('la ocupación es una raya, NUNCA «0.0%»', async () => {
    await montar();
    const ocupacion = tarjeta('Ocupación').textContent ?? '';
    expect(ocupacion).toContain('—');
    expect(ocupacion).not.toContain('0.0%');
  });

  it('la tasa de recaudo del resumen financiero es una raya', async () => {
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('—');
  });

  it('sin mes anterior contra el que comparar no hay flecha de tendencia', async () => {
    await montar();
    // El subtítulo «vs mes anterior» sólo se pinta junto a la flecha; si no
    // está, es que no se afirmó ninguna variación.
    expect(document.body.textContent).not.toContain('vs mes anterior');
  });

  it('los días promedio al cierre son una raya: nadie cerró nada todavía', async () => {
    await montar();
    expect(texto('resumen-dias-al-cierre')).toBe('—');
  });
});

describe('Resumen del negocio — con operación de verdad', () => {
  it('mide ocupación y recaudo, y muestra la variación contra el mes anterior', async () => {
    datos.kpis = enCero({
      totalProperties: 10,
      propertiesRented: 8,
      expectedRevenue: 10_000_000,
      collectedRevenue: 9_000_000,
      collectionRate: 90,
      occupancyRate: 80,
      collectionTrend: 12,
      avgDaysToClose: 18,
    });
    await montar();
    expect(tarjeta('Ocupación').textContent).toContain('80.0%');
    expect(texto('resumen-tasa-de-recaudo')).toBe('90.0%');
    expect(document.body.textContent).toContain('vs mes anterior');
    expect(texto('resumen-dias-al-cierre')).toContain('18');
  });

  it('un recaudo MEDIDO en cero no es una raya: se esperaba plata y no entró', async () => {
    // La distinción entera: 0 de $10M es una mora del 100%, no «sin datos».
    datos.kpis = enCero({
      totalProperties: 4,
      propertiesRented: 0,
      expectedRevenue: 10_000_000,
      collectedRevenue: 0,
    });
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('0.0%');
    expect(tarjeta('Ocupación').textContent).toContain('0.0%');
  });
});
