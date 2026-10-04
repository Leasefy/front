/**
 * 🔴🔴 BU-11 (QA del 04-10-2026, navegador visible como Iván): el buscador del
 * portal del inquilino mostraba DATOS INVENTADOS («Pago Febrero 2026 ·
 * $2,500,000 - Pendiente», «Mi Arriendo Actual · Apartamento 501 - Chapinero»,
 * «Nicolás Rodriguez»). Con el arreglo busca en lo suyo: el estado de cuenta,
 * sus solicitudes y sus acuerdos (servicios del portal, simulados acá).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mio, listMine, acuerdosMine } = vi.hoisted(() => ({
  mio: vi.fn(),
  listMine: vi.fn(),
  acuerdosMine: vi.fn(),
}));
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { mio } }));
vi.mock('@/lib/api/pqrs.service', () => ({ pqrsApi: { listMine } }));
vi.mock('@/lib/api/tenant-acuerdos.service', () => ({ acuerdosApi: { listMine: acuerdosMine } }));

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
  usePathname: () => '/inquilino/pagos',
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u-ivan', name: 'Iván Inquilino', email: 'inquilino@example.test', role: 'tenant' },
    logout: vi.fn(),
    agency: { name: 'Agencia ABC' },
    hasActiveAgencyMembership: false,
    activeContext: 'personal',
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

const ESTADO = {
  contratos: [
    {
      id: 'c3',
      numero: '3',
      inmueble: { direccion: 'Calle 45 # 70-12 Apto 301' },
      vigente: true,
      secciones: {
        arriendos: [
          {
            concepto: 'Saldo pendiente por Canon de arrendamiento. De 01-Oct-2026 hasta 31-Oct-2026',
            estado: 'PENDIENTE',
            fechaDePago: null,
            valorNeto: 1_770_112,
            fechaVencimiento: '2026-10-01',
            documentoDePago: null,
          },
        ],
        otrosConceptos: [],
      },
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
  for (const m of [mio, listMine, acuerdosMine]) m.mockReset();
  mio.mockResolvedValue(ESTADO);
  listMine.mockResolvedValue([
    { id: 'p4', radicado: 'PQRS-0004', tipo: 'reclamo', estado: 'resuelta', asunto: 'Cobro doble de la administración', descripcion: '' },
  ]);
  acuerdosMine.mockResolvedValue([]);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function buscar(texto: string) {
  await act(async () => {
    root.render(<PlanHeader />);
  });
  const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
  await act(async () => {
    input.focus();
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  });
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return container.querySelector('#plan-search-listbox')?.textContent ?? '';
}

describe('PlanHeader — buscador del portal del inquilino (BU-11)', () => {
  it('«pago» muestra SU cuota de octubre y nada inventado', async () => {
    const texto = await buscar('pago');
    expect(texto).toContain('Arriendo de octubre de 2026');
    expect(texto).toContain('$ 1.770.112');
    expect(texto).not.toMatch(/Febrero|2,500,000|Chapinero|Nicolás|Zona Rosa/);
  });

  it('«PQRS-0004» encuentra su reclamo', async () => {
    const texto = await buscar('PQRS-0004');
    expect(texto).toContain('PQRS-0004 · Cobro doble de la administración');
  });

  it('sin escribir: ni «2 activas» ni búsquedas recientes fijas', async () => {
    const texto = await buscar('');
    expect(texto).not.toMatch(/2 activas|pago febrero|Búsquedas recientes/);
    expect(texto).toContain('Mis pagos');
  });

  it('lee lo del inquilino una sola vez', async () => {
    await buscar('octubre');
    expect(mio).toHaveBeenCalledTimes(1);
  });
});
