/**
 * PlanHeader — "Tu Suscripción" popover in the agency context (T-0089).
 *
 * Bug: the popover resolved `currentPlan` via `getPlanById(planId)` against a
 * HARDCODED catalog (`starter|pro|flex`), so any admin-created tier (contrato
 * 29, e.g. "pro-plus") fell back to Starter with Starter's features — even
 * though `agencyPlanId` itself was resolved correctly. Fix: for the agency
 * context, resolve against the LIVE catalog (`useAgencyPlans()` +
 * `agencyPlanId`), exactly like `upgrade/page.tsx` and `ConfigFacturacion.tsx`.
 *
 * The Radix Popover mounts its content in a portal — for assertions it is
 * flattened to a plain div (same technique as `PilotoModoHeader.test.tsx`).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// El Popover de Radix se monta en un portal; para leerlo se pinta plano
// (misma técnica que PilotoModoHeader.test.tsx).
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="subscription-popover">{children}</div>
  ),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/panel/inmobiliaria/piloto',
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { name: 'Ana Admin', email: 'ana@agencia.co', role: 'agency' },
    logout: vi.fn(),
    agency: { name: 'Agencia ABC' },
    hasActiveAgencyMembership: false,
    activeContext: 'agency',
    setActiveContext: vi.fn(),
  }),
}));

const subState: { value: { subscription: unknown; error: string | null; refetch: ReturnType<typeof vi.fn> } } = {
  value: { subscription: null, error: null, refetch: vi.fn() },
};
vi.mock('@/lib/hooks/useSubscription', () => ({
  useMySubscription: () => subState.value,
  useAgencyPlans: () => agencyPlansState.value,
}));

const agencySubState: {
  value: {
    currentPlanId: string | undefined;
    error: Error | null;
    refetch: ReturnType<typeof vi.fn>;
    state?: { pendingPlanTier: string | null; pendingPlanEffectiveAt: string | null };
  };
} = {
  value: { currentPlanId: 'starter', error: null, refetch: vi.fn() },
};
vi.mock('@/lib/hooks/useAgencySubscription', () => ({
  useAgencySubscription: () => agencySubState.value,
}));

const agencyPlansState: { value: { plans: unknown[]; isLoading: boolean; error?: string | null } } = {
  value: { plans: [], isLoading: false, error: null },
};

vi.mock('@/lib/hooks/useNotifications', () => ({
  useLandlordNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    refetch: vi.fn(),
  }),
  useTenantNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/cobranza/use-arco-alerts', () => ({
  useArcoAlerts: () => ({ all: [], hasOverdue: false }),
}));

vi.mock('@/components/inmobiliaria/cobranza/ArcoDeadlineAlert', () => ({
  ArcoDeadlineAlert: () => null,
}));

vi.mock('@/components/feedback/FeedbackCta', () => ({
  FeedbackCta: () => null,
}));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: true, canAccess: () => true }),
}));

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefsSafe: () => null,
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  inmobiliariaConfigApi: { inviteUser: vi.fn() },
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyUsers: () => ({ users: [], refetch: vi.fn() }),
}));

import { PlanHeader } from './PlanHeader';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  subState.value = { subscription: null, error: null, refetch: vi.fn() };
  agencySubState.value = { currentPlanId: 'starter', error: null, refetch: vi.fn() };
  agencyPlansState.value = { plans: [], isLoading: false };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render() {
  act(() => {
    root.render(<PlanHeader />);
  });
}

const PRO_PLUS_CATALOG = [
  {
    id: 'pro-plus',
    name: 'Pro Plus',
    description: 'Todo en Pro, más cupo',
    pricingModel: 'flat' as const,
    price: { monthly: 249000, yearly: null },
    evaluation: { price: 15000, discount: 64, limit: 60 },
    limits: { properties: 200, users: 20 },
    features: ['Hasta 200 propiedades', 'Scoring premium', 'Soporte dedicado'],
    level: 2,
    isDefault: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Probar la plataforma',
    pricingModel: 'free' as const,
    price: { monthly: 0, yearly: 0 },
    evaluation: { price: 42000, discount: 0, limit: null },
    limits: { properties: 10, users: 2 },
    features: ['Scoring básico'],
    level: 0,
    isDefault: true,
  },
];

describe('PlanHeader — "Tu Suscripción" popover resolves the REAL agency plan', () => {
  it('renders the live-catalog plan name + features for an ACTIVE pro-plus agency', () => {
    agencySubState.value = { currentPlanId: 'pro-plus', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).toContain('Plan Pro Plus');
    expect(popover.textContent).toContain('Hasta 200 propiedades');
    expect(popover.textContent).toContain('Scoring premium');
    expect(popover.textContent).not.toContain('Plan Starter');
  });

  it('still renders Starter for an agency actually on the free/default plan', () => {
    agencySubState.value = { currentPlanId: 'starter', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).toContain('Plan Starter');
  });

  it('never flashes "Plan Starter" while the live catalog is still loading', () => {
    agencySubState.value = { currentPlanId: 'pro-plus', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: [], isLoading: true };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).not.toContain('Plan Starter');
    expect(popover.textContent).not.toContain('Plan Pro Plus');
  });

  it('shows the honest error state (not the legacy landlord error) when the agency subscription fails to load', () => {
    agencySubState.value = { currentPlanId: undefined, error: new Error('boom'), refetch: vi.fn() };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).toContain('No pudimos cargar tu plan');
  });

  it('never falls back to "Plan Starter" when the CATALOG fetch fails independently of the subscription fetch (fix round 1, F1)', () => {
    // Subscription resolves fine — the agency IS on pro-plus. Only the plans
    // catalog fetch failed. useAgencyPlans() degrades `plans` to the static
    // AGENCY_PLANS list on error (useSubscription.ts), which does not contain
    // "pro-plus" — silently trusting it would reproduce the exact bug this
    // task exists to fix.
    agencySubState.value = { currentPlanId: 'pro-plus', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: [], isLoading: false, error: 'Error al cargar planes' };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).not.toContain('Plan Starter');
    expect(popover.textContent).toContain('No pudimos cargar tu plan');
  });

  it('echoes a pending scheduled change (T-0089)', () => {
    agencySubState.value = {
      currentPlanId: 'pro-plus',
      error: null,
      refetch: vi.fn(),
      state: { pendingPlanTier: 'starter', pendingPlanEffectiveAt: '2026-10-12T00:00:00.000Z' },
    };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).toContain('Cambia a Starter');
  });

  it('shows no pending-change echo when nothing is scheduled', () => {
    agencySubState.value = {
      currentPlanId: 'pro-plus',
      error: null,
      refetch: vi.fn(),
      state: { pendingPlanTier: null, pendingPlanEffectiveAt: null },
    };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();

    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).not.toContain('Cambia a');
  });
});
