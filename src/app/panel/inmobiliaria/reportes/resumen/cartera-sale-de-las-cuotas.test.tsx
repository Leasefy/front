/**
 * La alerta de cartera del resumen del negocio sale de las CUOTAS del contrato.
 *
 * Visto en vivo el 2026-09-16 con la agencia de QA: la alerta decía «5 cobros
 * en mora por $11.705.223» —los cobros que alguien alcanzó a emitir— con 97
 * cuotas del mes en cartera por $321.945.650. El número bueno ya viajaba en
 * `kpis.deuda` y la pantalla no lo leía. Y «Recaudo del mes $0» salía sin
 * decir que habían entrado $8.200.000 por caja sin imputar a ninguna cuota,
 * aunque el back lo mandaba escrito en `deuda.avisos`.
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
function deudaDeQa(sobre: Partial<DeudaDelTablero> = {}): DeudaDelTablero {
  const cajones = {
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
    total: { ...cajones, totalCop: 5_326_247_800, cuotas: 1521, cuotasEnCartera: 885 },
    delMes: cajones,
    causadoDelMesCop: 364_795_650,
    abonadoDelMesCop: 0,
    recaudadoEnCajaCop: 8_200_000,
    porGirarAPropietariosCop: 4_833_737_280,
    cuotasDeInquilino: 2689,
    contratosSinCuotas: 0,
    avisos: [
      'Entraron 8.200.000 COP por caja este mes que no están imputados a ninguna cuota: el recaudo del mes sale en cero porque esa plata todavía no bajó la deuda de nadie.',
    ],
    ...sobre,
  };
}

/** Cinco cobros viejos en mora: lo que la alerta contaba antes. */
function cobrosEnMora(): Cobro[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `cobro-${i}`,
    status: 'late',
    pendingAmount: 2_341_044,
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

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.kpis = kpis();
  datos.cobros = [];
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

describe('Resumen del negocio — la cartera sale de las cuotas', () => {
  it('🔴 con `deuda`, la alerta cuenta las cuotas del mes en cartera, no los cobros', async () => {
    datos.kpis = kpis({ deuda: deudaDeQa() });
    datos.cobros = cobrosEnMora();
    await montar();

    const alerta = $('alerta-cartera-del-mes')?.textContent ?? '';
    expect(alerta).toContain('97 cuotas del mes en cartera');
    expect(alerta).toContain('321.945.650');
    expect(alerta).not.toContain('Cobros');
    expect($('alerta-cartera-del-mes')?.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/pagos/cartera',
    );
    // Los cinco cobros ya no son la alerta.
    expect($('alerta-cobros-en-mora')).toBeNull();
  });

  it('sin cuotas en cartera no hay alerta, aunque haya cobros viejos en mora', async () => {
    datos.kpis = kpis({
      deuda: deudaDeQa({
        delMes: { ...deudaDeQa().delMes, carteraCop: 0, cuotasEnCartera: 0 },
        avisos: [],
      }),
    });
    datos.cobros = cobrosEnMora();
    await montar();

    expect($('alerta-cartera-del-mes')).toBeNull();
    expect($('alerta-cobros-en-mora')).toBeNull();
  });

  it('un back que todavía no manda `deuda` sigue avisando con los cobros', async () => {
    datos.kpis = kpis();
    datos.cobros = cobrosEnMora();
    await montar();

    expect($('alerta-cartera-del-mes')).toBeNull();
    expect($('alerta-cobros-en-mora')?.textContent).toContain('5 cobros en mora');
  });

  it('🔴 el aviso de la deuda se pinta: el «Recaudo del mes $0» deja de ser inexplicable', async () => {
    datos.kpis = kpis({ deuda: deudaDeQa() });
    await montar();

    const avisos = Array.from(document.querySelectorAll('[data-testid="aviso-de-la-deuda"]'));
    expect(avisos).toHaveLength(1);
    expect(avisos[0].textContent).toContain('no están imputados a ninguna cuota');
    expect(avisos[0].querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/recaudo');
  });
});
