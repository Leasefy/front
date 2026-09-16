/**
 * El resumen del negocio, bloque «Equipo»: la comisión del mes de cada agente.
 *
 * Mismo defecto que el ranking: la comisión sale de los giros atribuidos por la
 * consignación del inmueble, y sin agente asignado el giro no le suma a nadie.
 * Pintar «$0» ahí es presentar un vacío de datos como un mal mes. Con el
 * resumen de `GET /inmobiliaria/agentes/comisiones` la cifra pasa a «—» con su
 * razón y aparece el aviso que dice dónde se arregla.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Agente, InmobiliariaDashboardKPIs } from '@/lib/types/inmobiliaria';
import type { ResumenDeComisiones } from '@/components/inmobiliaria/ComisionesSinAtribuir';

const { estado } = vi.hoisted(() => ({
  estado: {
    comision: 0,
    resumen: null as ResumenDeComisiones | null,
    get: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}));
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: estado.get },
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaDashboard: () => ({
    kpis: {
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
      totalAgents: 1,
      closedThisMonth: 0,
      avgDaysToClose: 0,
      totalPropietarios: 0,
      pendingDispersions: 0,
    } as InmobiliariaDashboardKPIs,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useAgentes: () => ({
    agentes: [
      {
        id: 'm1',
        name: 'Sofía Ruiz',
        status: 'active',
        metrics: {
          assignedProperties: 0,
          activeLeases: 0,
          closedThisMonth: 0,
          closedThisYear: 0,
          totalCommissions: estado.comision,
          commissionsThisMonth: estado.comision,
          avgDaysToClose: 0,
          conversionRate: 0,
        },
      } as unknown as Agente,
    ],
  }),
  usePipelineItems: () => ({ pipelineItems: [] }),
  useCobros: () => ({ cobros: [] }),
  useMantenimientos: () => ({ mantenimientos: [] }),
}));

import DashboardPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resumen(extra: Partial<ResumenDeComisiones> = {}): ResumenDeComisiones {
  return {
    mes: '2026-09',
    giros: { total: 3, deCuotas: 3, historicos: 0, descartadosPorDuplicado: 0 },
    sinAgente: { giros: 3, girosDelMes: 3, comisionCop: 300_000, comisionDelMesCop: 300_000 },
    deAgentesFueraDelEquipo: { giros: 0, comisionCop: 0 },
    contratosVigentes: { total: 4, sinAgente: 4 },
    ...extra,
  };
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<DashboardPage />);
  });
  // El resumen llega por una promesa: se deja resolver.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  estado.comision = 0;
  estado.get.mockReset();
  estado.get.mockImplementation((ruta: string) =>
    ruta === '/inmobiliaria/agentes/comisiones'
      ? Promise.resolve(estado.resumen)
      : Promise.reject(new Error(`ruta no esperada: ${ruta}`)),
  );
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

describe('Resumen del negocio — comisión del agente sin camino', () => {
  it('con giros sin agente, el «$0» del mes es «—» con su razón, y aparece el aviso', async () => {
    estado.resumen = resumen();
    await montar();

    const celda = document.querySelector('[data-testid="agente-comision-sin-camino"]');
    expect(celda?.textContent).toBe('—');
    expect(celda?.getAttribute('aria-label')).toBe(
      '3 giros de este mes sin agente asignado: esta cifra no los incluye.',
    );
    const aviso = document.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]');
    expect(aviso?.textContent).toContain('Ninguno de los 4 contratos vigentes tiene agente asignado');
  });

  it('con todo atribuido, la cifra real se muestra y no hay aviso', async () => {
    estado.comision = 120_000;
    estado.resumen = resumen({
      sinAgente: { giros: 0, girosDelMes: 0, comisionCop: 0, comisionDelMesCop: 0 },
      contratosVigentes: { total: 4, sinAgente: 0 },
    });
    await montar();

    expect(document.querySelector('[data-testid="agente-comision-sin-camino"]')).toBeNull();
    expect(document.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]')).toBeNull();
    expect(document.body.textContent).toContain('120.000');
  });

  it('si el resumen no llega, no se afirma nada: la cifra como antes y sin aviso', async () => {
    estado.get.mockRejectedValue(new Error('500'));
    await montar();
    expect(document.querySelector('[data-testid="agente-comision-sin-camino"]')).toBeNull();
    expect(document.querySelector('[data-testid="aviso-comisiones-sin-atribuir"]')).toBeNull();
  });
});
