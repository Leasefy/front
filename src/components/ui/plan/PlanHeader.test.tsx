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

const permisos: { value: { isAdmin: boolean; canAccess: (m: string, a: string) => boolean } } = {
  value: { isAdmin: true, canAccess: () => true },
};
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.value,
}));

// El modal se prueba en su propio archivo; acá sólo importa qué recibe.
const { modalDelEquipo } = vi.hoisted(() => ({ modalDelEquipo: vi.fn() }));
vi.mock('@/components/inmobiliaria/invitar-al-equipo/InvitarAlEquipo', () => ({
  InvitarAlEquipo: (props: { open: boolean; puedeInvitar: boolean }) => {
    modalDelEquipo(props);
    return props.open ? <div data-testid="modal-del-equipo">{props.puedeInvitar ? 'puede invitar' : 'sólo mira'}</div> : null;
  },
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
  permisos.value = { isAdmin: true, canAccess: () => true };
  modalDelEquipo.mockClear();
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

// ── «Invitar a tu equipo» (02-10-2026) ─────────────────────────────────────

const PORCENTAJE_CATALOG = [
  {
    id: 'flex',
    name: 'Porcentaje',
    description: 'Plan de pago por uso',
    pricingModel: 'usage' as const,
    price: { monthly: 0, yearly: 0 },
    evaluation: { price: 0, discount: 0, limit: null },
    limits: { properties: -1, users: -1 },
    features: ['Sin mensualidad'],
    level: null,
    isDefault: false,
  },
];

const botonDelEquipo = () =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
    (b.getAttribute('aria-label') ?? '').startsWith('Invitar a tu equipo'),
  );

describe('PlanHeader — «Invitar a tu equipo» abre un modal, no un popover', () => {
  it('el administrador ve el botón y abre el modal pudiendo invitar', () => {
    render();
    const boton = botonDelEquipo();
    expect(boton).toBeTruthy();
    expect(boton!.getAttribute('aria-haspopup')).toBe('dialog');
    expect(container.querySelector('[data-testid="modal-del-equipo"]')).toBeNull();

    act(() => boton!.click());

    expect(container.querySelector('[data-testid="modal-del-equipo"]')!.textContent).toBe('puede invitar');
    // El formulario viejo (cuatro tarjetas de rol) ya no está en el encabezado.
    expect(container.textContent).not.toContain('Enviar Invitación');
    expect(container.textContent).not.toContain('Colabora con tu equipo');
  });

  it('quien ve el equipo sin ser administrador lo abre, pero sin poder invitar', () => {
    permisos.value = { isAdmin: false, canAccess: (m, a) => m === 'configuracion' && a === 'view' };
    render();
    act(() => botonDelEquipo()!.click());
    expect(container.querySelector('[data-testid="modal-del-equipo"]')!.textContent).toBe('sólo mira');
  });

  it('sin permiso para ver el equipo no hay botón ni modal', () => {
    permisos.value = { isAdmin: false, canAccess: () => false };
    render();
    expect(botonDelEquipo()).toBeUndefined();
    expect(modalDelEquipo).not.toHaveBeenCalled();
  });
});

describe('PlanHeader — sin la pastilla del plan junto al avatar (Nico, 02-10-2026)', () => {
  it('con el plan «Porcentaje» no sale la corona ni el nombre del plan junto al avatar', () => {
    agencySubState.value = { currentPlanId: 'flex', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PORCENTAJE_CATALOG, isLoading: false };
    render();

    const avatar = container.querySelector('[data-tour-target="perfil"]')!;
    expect(avatar).toBeTruthy();
    expect(avatar.textContent).not.toContain('Porcentaje');
    expect(avatar.querySelector('[title^="Plan "]')).toBeNull();
    // El plan sigue a un toque, en «Tu suscripción»: sólo dejó de mostrarse ahí.
    const popover = container.querySelector('[data-testid="subscription-popover"]')!;
    expect(popover.textContent).toContain('Porcentaje');
  });
});

describe('«Tu suscripción» con su glow up (Nico, 03-10-2026)', () => {
  const PORCENTAJE_1 = [
    {
      ...PORCENTAJE_CATALOG[0],
      pricingModel: 'percentage' as const,
      canonPercentage: 1,
      features: ['Propiedades ilimitadas', 'Usuarios ilimitados', 'Evaluaciones IA ilimitadas incluidas', 'Scoring premium', 'Soporte dedicado'],
    },
  ];
  const popover = () => container.querySelector<HTMLElement>('[data-testid="subscription-popover"]')!;

  it('etiqueta en mono y en minúscula, la ✕ de la casa y nada de la franja gris', () => {
    agencySubState.value = { currentPlanId: 'flex', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PORCENTAJE_1, isLoading: false };
    render();
    const p = popover();
    const titulo = p.querySelector('h3')!;
    expect(titulo.textContent).toBe('Tu suscripción');
    expect(titulo.className).toContain('font-mono');
    const aspa = p.querySelector<HTMLButtonElement>('button[aria-label="common.close"]')!;
    expect(aspa.className).toContain('rounded-full');
    expect(aspa.className).toMatch(/\bborder\b/);
    // `surface-muted` y `plan-primary` en oscuro son grises amarillentos sobre el negro.
    // (El `active:bg-surface-muted` del botón secundario de Cadence es el de presionar: se vale.)
    const fondos = Array.from(p.querySelectorAll('*')).flatMap((el) => Array.from(el.classList));
    expect(fondos).not.toContain('bg-surface-muted');
    expect(fondos).not.toContain('bg-plan-primary');
  });

  it('la loseta del plan va en cobalto y el porcentaje en mono', () => {
    agencySubState.value = { currentPlanId: 'flex', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PORCENTAJE_1, isLoading: false };
    render();
    const p = popover();
    expect(p.textContent).toContain('Plan Porcentaje');
    expect(p.textContent).toContain('1% del canon administrado');
    expect(p.querySelector('.bg-primary-soft.text-primary')).not.toBeNull();
    const cifra = Array.from(p.querySelectorAll('span')).find((s) => s.textContent === '1%')!;
    expect(cifra.className).toContain('font-mono');
  });

  it('lo incluido es una lista con sus vistos, y dice cuántas cosas más trae el plan', () => {
    agencySubState.value = { currentPlanId: 'flex', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PORCENTAJE_1, isLoading: false };
    render();
    const lista = popover().querySelector('ul[aria-label="Lo que incluye tu plan"]')!;
    const items = Array.from(lista.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual([
      'Propiedades ilimitadas',
      'Usuarios ilimitados',
      'Evaluaciones IA ilimitadas incluidas',
      'Scoring premium',
      'y 1 más en tu plan',
    ]);
  });

  it('las acciones son píldoras: «Gestionar suscripción» siempre; «Ver planes» fuera del plan más alto', () => {
    agencySubState.value = { currentPlanId: 'pro-plus', error: null, refetch: vi.fn() };
    agencyPlansState.value = { plans: PRO_PLUS_CATALOG, isLoading: false };
    render();
    const links = Array.from(popover().querySelectorAll('a'));
    const ver = links.find((a) => a.textContent?.includes('Ver planes'))!;
    const gestionar = links.find((a) => a.textContent?.includes('Gestionar suscripción'))!;
    expect(ver.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
    expect(gestionar.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
    expect(ver.className).toContain('rounded-full');
    expect(gestionar.className).toContain('rounded-full');
    expect(popover().textContent).not.toContain('Ver Planes');
  });
});
