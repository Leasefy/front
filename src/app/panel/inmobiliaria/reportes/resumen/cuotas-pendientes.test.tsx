/**
 * «34 cobros pendientes» — el resumen del negocio contaba COBROS.
 *
 * Lo pendiente sale de las cuotas del contrato (Nico, 2026-09-15), y el cobro es
 * sólo el documento con que alguien alcanzó a reclamar un mes. La tarjeta dice
 * ahora «Cuotas pendientes» con el número de Cartera: todas las cuotas con
 * saldo (`kpis.deuda.total.cuotas`, mismo criterio que el informe de cartera),
 * y cuántas de ésas ya son cartera. Un back que no manda `deuda` no tiene ese
 * número, y la tarjeta lo dice en vez de contar cobros con otro rótulo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Cobro, DeudaDelTablero, InmobiliariaDashboardKPIs } from '@/lib/types/inmobiliaria';

const { datos } = vi.hoisted(() => ({
  datos: {
    kpis: null as InmobiliariaDashboardKPIs | null,
    cobros: [] as Cobro[],
  },
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
  useCobros: () => ({ cobros: datos.cobros }),
  useMantenimientos: () => ({ mantenimientos: [] }),
}));

import DashboardPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function kpis(sobre: Partial<InmobiliariaDashboardKPIs> = {}): InmobiliariaDashboardKPIs {
  return {
    totalProperties: 108,
    propertiesAvailable: 1,
    propertiesRented: 5,
    propertiesInProcess: 0,
    occupancyRate: 83.3,
    expectedRevenue: 364_795_650,
    collectedRevenue: 0,
    pendingCollections: 42_850_000,
    lateCollections: 321_945_650,
    collectionRate: 0,
    totalCommissions: 33_416_000,
    collectionTrend: 0,
    commissionsTrend: 0,
    activeLeads: 0,
    scheduledVisits: 0,
    pendingApplications: 0,
    contractsInProgress: 0,
    totalAgents: 0,
    closedThisMonth: 0,
    avgDaysToClose: 0,
    totalPropietarios: 50,
    pendingDispersions: 0,
    ...sobre,
  };
}

/** Los números de la agencia de QA el 2026-09-16. */
function deudaDeQa(): DeudaDelTablero {
  const delMes = {
    totalCop: 364_795_650,
    porVencerCop: 0,
    vencidaEnPlazoCop: 42_850_000,
    carteraCop: 321_945_650,
    cuotas: 105,
    cuotasPorVencer: 0,
    cuotasVencidasEnPlazo: 8,
    cuotasEnCartera: 97,
  };
  return {
    month: '2026-09',
    hoy: '2026-09-16',
    total: {
      totalCop: 5_326_247_800,
      porVencerCop: 4_000_000_000,
      vencidaEnPlazoCop: 200_000_000,
      carteraCop: 1_126_247_800,
      cuotas: 1521,
      cuotasPorVencer: 600,
      cuotasVencidasEnPlazo: 36,
      cuotasEnCartera: 885,
    },
    delMes,
    causadoDelMesCop: 364_795_650,
    abonadoDelMesCop: 0,
    recaudadoEnCajaCop: 0,
    porGirarAPropietariosCop: 0,
    cuotasDeInquilino: 2689,
    contratosSinCuotas: 0,
    avisos: [],
  };
}

/** 34 cobros emitidos pendientes o en mora: lo que la tarjeta contaba antes. */
function cobrosViejos(): Cobro[] {
  return Array.from({ length: 34 }, (_, i) => ({
    id: `cobro-${i}`,
    status: i < 5 ? 'late' : 'pending',
    pendingAmount: 1_000_000,
  })) as unknown as Cobro[];
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

const tarjeta = () => document.querySelector('[data-testid="resumen-cuotas-pendientes"]');

beforeEach(() => {
  datos.kpis = kpis();
  datos.cobros = cobrosViejos();
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

describe('Resumen del negocio — lo pendiente son cuotas', () => {
  it('🔴 con `deuda`, la tarjeta cuenta las cuotas con saldo (el número de Cartera), no los 34 cobros', async () => {
    datos.kpis = kpis({ deuda: deudaDeQa() });
    await montar();

    const texto = tarjeta()?.textContent ?? '';
    expect(texto).toContain('Cuotas pendientes');
    expect(texto).toContain('1.521');
    expect(texto).toContain('885 en cartera');
    expect(texto).not.toContain('34');
    expect(texto).not.toMatch(/cobros/i);
  });

  it('🔴 sin `deuda` no inventa el número: lo dice, y tampoco cuenta los cobros como cuotas', async () => {
    await montar();

    const texto = tarjeta()?.textContent ?? '';
    expect(texto).toContain('Cuotas pendientes');
    expect(texto).toContain('—');
    expect(texto).toContain('El servidor todavía no manda las cuotas del contrato');
    expect(texto).not.toContain('34');
  });

  it('«Cobros pendientes» ya no aparece en la pantalla', async () => {
    datos.kpis = kpis({ deuda: deudaDeQa() });
    await montar();

    expect(document.body.textContent).not.toContain('Cobros pendientes');
  });
});
