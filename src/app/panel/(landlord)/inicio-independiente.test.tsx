/**
 * Inicio del propietario que arrienda solo (glow up 22-10): el encabezado común con «publicar» como la acción
 * principal; LA RESPUESTA (lo que entra al mes) en grande y las demás en una franja, sin el resumen de la columna
 * que repetía lo mismo.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel',
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n}`,
    formatDate: () => '17 oct 2026',
  }),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Pedro Ruiz', onboardingCompleted: true } }) }));
vi.mock('@/lib/hooks/use-time-greeting', () => ({ useTimeGreeting: () => ({ greeting: 'Buenas noches' }) }));
vi.mock('@/lib/hooks/useVisits', () => ({ useVisits: () => ({ getUpcoming: () => [] }) }));
vi.mock('@/components/landlord/ContratosConLaInmobiliaria', () => ({
  useContratosAdministrados: () => ({ doc: null, cargando: false }),
  ContratosConLaInmobiliaria: () => null,
}));
vi.mock('@/lib/hooks/useLandlord', () => ({
  useLandlordProperties: () => ({
    properties: [
      { id: 'p-1', title: 'Apartamento en Laureles', monthlyRent: 2_000_000, candidateCount: 3, pendingCount: 1, status: 'published' },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useLandlordDashboard: () => ({
    dashboard: {
      financial: { monthlyIncome: 2_000_000, activeLeases: 1, collectionRate: 96, pendingPayments: 0 },
      urgentActions: [],
      upcomingEvents: [],
      recentActivity: [],
      riskDistribution: { A: 0, B: 0, C: 0, D: 0 },
    },
    isLoading: false,
  }),
}));
vi.mock('@/components/property/PortadaDelInmueble', () => ({ PortadaDelInmueble: () => null }));
vi.mock('@/components/marketplace/inmobiliaria/PreguntaDeLaRecomendacion', () => ({ PreguntaDeLaRecomendacion: () => null }));

import PanelPage from './page';

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

describe('Inicio del propietario independiente', () => {
  it('el encabezado común y lo que entra al mes en grande, sin repetirlo en la columna', async () => {
    await act(async () => root.render(<PanelPage />));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const encabezado = host.querySelector('[data-testid="encabezado-del-propietario-independiente"]');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Buenas noches, Pedro');
    expect(encabezado?.querySelector('a[href="/publicar?from=panel"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="ingreso-del-mes"]')).not.toBeNull();
    // Antes, el resumen de la columna repetía el ingreso y la tasa: ya no.
    expect(host.textContent).not.toContain('landlord.dashboard.financialSummary');
    expect(host.textContent).toContain('96 %');
  });
});
