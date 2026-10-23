/**
 * GLOW UP (21-10-2026): el resumen del negocio se lee en el orden del trabajo.
 *
 * Antes: título → cifras → captación y equipo → cuatro tarjetas de atajos →
 * alertas → resumen financiero. Lo urgente (la cartera, los mantenimientos sin
 * cerrar) era lo último de la página. Ahora: el encabezado con los atajos, lo
 * que hay que atender, las cifras del mes y el recaudo, y al final lo que se
 * consulta (captación y equipo).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { InmobiliariaDashboardKPIs, SolicitudMantenimiento as Mantenimiento } from '@/lib/types/inmobiliaria';

const { datos } = vi.hoisted(() => ({
  datos: {
    kpis: null as InmobiliariaDashboardKPIs | null,
    mantenimientos: [] as Mantenimiento[],
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
  useCobros: () => ({ cobros: [] }),
  useMantenimientos: () => ({ mantenimientos: datos.mantenimientos }),
}));

import ResumenPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function kpis(): InmobiliariaDashboardKPIs {
  return {
    totalProperties: 12,
    propertiesAvailable: 2,
    propertiesRented: 10,
    propertiesInProcess: 0,
    occupancyRate: 83.3,
    expectedRevenue: 24_000_000,
    collectedRevenue: 18_000_000,
    pendingCollections: 6_000_000,
    lateCollections: 0,
    collectionRate: 75,
    totalCommissions: 1_800_000,
    collectionTrend: null as unknown as number,
    commissionsTrend: null as unknown as number,
    activeLeads: 3,
    scheduledVisits: 1,
    pendingApplications: 0,
    contractsInProgress: 2,
    totalAgents: 1,
    closedThisMonth: 0,
    avgDaysToClose: 0,
    totalPropietarios: 8,
    pendingDispersions: 0,
  };
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<ResumenPage />);
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

/** `a` aparece antes que `b` en la página. */
function antes(a: Element | null, b: Element | null): boolean {
  if (!a || !b) throw new Error('falta un bloque');
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  datos.kpis = kpis();
  datos.mantenimientos = [];
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

describe('Resumen del negocio — en el orden del trabajo', () => {
  it('lo que hay que atender va antes que las cifras', async () => {
    datos.mantenimientos = [{ id: 'm1', status: 'open' } as unknown as Mantenimiento];
    await montar();
    expect(antes($('alerta-mantenimientos'), $('resumen-cuotas-pendientes'))).toBe(true);
    expect($('resumen-para-atender')?.contains($('alerta-mantenimientos'))).toBe(true);
  });

  it('el recaudo del mes va antes que la captación y el equipo', async () => {
    await montar();
    expect(antes($('resumen-tasa-de-recaudo'), $('resumen-dias-al-cierre'))).toBe(true);
  });

  it('el encabezado lleva sólo «Ver reportes»: la pantalla es para leer (revisora r24 #4)', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBeTruthy();
    expect($('resumen-ver-reportes')?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes');
    expect(encabezado?.contains($('resumen-ver-reportes'))).toBe(true);
    for (const id of ['resumen-nuevo-propietario', 'resumen-nueva-consignacion', 'resumen-hacer-recibo']) {
      expect($(id)).toBeNull();
    }
  });

  it('la respuesta va antes que lo que hay que atender (revisora r24 #1)', async () => {
    datos.mantenimientos = [{ id: 'm1', status: 'open' } as unknown as Mantenimiento];
    await montar();
    expect(antes($('resumen-tasa-de-recaudo'), $('alerta-mantenimientos'))).toBe(true);
  });
});
