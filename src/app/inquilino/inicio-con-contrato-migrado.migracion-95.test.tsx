/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — CA-04, decisión de Nico (a):
 * el inicio del portal no trata como alguien que busca dónde vivir a quien
 * tiene un contrato migrado (sin arriendo porque el archivo no traía día de
 * pago). Visto: «Todavía no sabes hasta cuánto puedes arrendar», sin su
 * arriendo en los contadores.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const contratosMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/hooks/use-contratos-del-portal', () => ({ useContratosDelPortal: () => contratosMock() }));
vi.mock('@/lib/hooks/useResumenDelPortal', () => ({ useResumenDelPortal: () => null, useEstadoDeCuentaDelPortal: () => null }));
vi.mock('@/lib/hooks/useProperties', () => ({ useFeaturedProperties: () => ({ properties: [], isLoading: false }) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Valentina Arango', profileSource: 'backend', onboardingCompleted: true }, isLoading: false }) }));
vi.mock('@/lib/hooks/use-time-greeting', () => ({ useTimeGreeting: () => ({ greeting: 'Buenas tardes' }) }));
vi.mock('@/lib/hooks/useEvaluation', () => ({ useEvaluation: () => ({ evaluation: null, isPaid: false, score: null, purchaseEvaluation: vi.fn() }) }));
vi.mock('@/lib/hooks/useApplications', () => ({ useTenantApplications: () => ({ active: [], isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/lib/hooks/useLeases', () => ({
  useLeases: () => ({ getActive: () => [], isLoading: false, error: null, refetch: vi.fn() }),
  useMyPayments: () => ({ getNextPayment: () => null }),
}));
vi.mock('@/lib/hooks/use-tenant-cases', () => ({ useTenantCases: () => ({ openCasesCount: 0 }) }));
vi.mock('@/lib/hooks/use-aprobacion', () => ({ useAprobacion: () => ({ aprobacion: null, vigente: false }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => String(n) }) }));
vi.mock('@/components/estado/FalloDeCarga', () => ({ FalloDeCarga: () => null }));
vi.mock('@/components/tenant/PropertyDetailSheet', () => ({ PropertyDetailSheet: () => null }));
vi.mock('@/components/tenant/TenantDashboardEmpty', () => ({ TenantDashboardEmpty: () => null }));
vi.mock('@/components/tenant/TopeAprobadoBanner', () => ({ TopeAprobadoBanner: () => <div data-testid="tope-aprobado" /> }));
vi.mock('@/components/ui/empty-state', () => ({ EmptyState: () => null }));
vi.mock('@/components/tenant/ScoreCard', () => ({ ScoreCard: () => null }));
vi.mock('@/components/tenant/ScoreDetailSheet', () => ({ ScoreDetailSheet: () => null }));
vi.mock('@/components/tenant/ScoreShareModal', () => ({ ScoreShareModal: () => null }));

import InquilinoPage from './page';

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<InquilinoPage />));
}

describe('el inicio del inquilino con contrato migrado (CA-04)', () => {
  it('no le ofrece «hasta cuánto puedes arrendar» y cuenta su arriendo', () => {
    contratosMock.mockReturnValue({ contratos: [{ contratoId: 'c-1' }, { contratoId: 'c-10' }], cargando: false });
    montar();
    expect(host.querySelector('[data-testid="tope-aprobado"]')).toBeNull();
    const arriendos = [...host.querySelectorAll('a[href="/inquilino/arriendo"]')].map((a) => a.textContent ?? '').join(' ');
    expect(arriendos).toContain('2');
    expect(arriendos).toContain('Contratos vigentes');
  });
  it('sin contratos ni arriendos sigue siendo el inicio de quien llega', () => {
    contratosMock.mockReturnValue({ contratos: [], cargando: false });
    montar();
    expect(host.querySelector('[data-testid="tope-aprobado"]')).not.toBeNull();
  });
});
