/**
 * GLOW UP (21-10-2026): «Mejora tu plan» del propietario con el encabezado
 * común (antes: degradado, manchas difusas, vidrio esmerilado y una chispita),
 * el plan actual al lado del título, y al pago sin la espera inventada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { datos, push } = vi.hoisted(() => ({
  datos: { error: null as unknown },
  push: vi.fn(),
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/hooks/useSubscription', () => ({
  useMySubscription: () => ({
    subscription: datos.error ? null : { planId: 'starter', currentPeriodEnd: '2026-11-21T00:00:00.000Z' },
    error: datos.error,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/planes/use-planes-del-propietario', () => ({
  usePlanesDelPropietario: () => ({
    planDe: (id: string) => ({
      id,
      name: id === 'starter' ? 'Starter' : 'Pro',
      price: { monthly: id === 'starter' ? 0 : 99_000, yearly: id === 'starter' ? 0 : 990_000 },
      features: [],
    }),
  }),
}));
vi.mock('@/components/pricing', () => ({
  PricingTable: ({ onSelectPlan }: { onSelectPlan: (id: string) => void }) => (
    <button type="button" data-testid="elegir-pro" onClick={() => onSelectPlan('pro')}>
      Pro
    </button>
  ),
}));

import UpgradePage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<UpgradePage />);
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.error = null;
  push.mockClear();
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('Mejora tu plan (propietario)', () => {
  it('el encabezado común con el plan actual al lado, sin vidrio ni degradados', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Mejora tu plan');
    expect(encabezado?.contains($('plan-actual'))).toBe(true);
    expect($('plan-actual')?.textContent).toContain('Starter');
    expect(document.body.innerHTML).not.toContain('backdrop-blur');
    expect(document.body.innerHTML).not.toContain('bg-gradient');
  });

  it('si no se pudo leer el plan, el encabezado no inventa uno', async () => {
    datos.error = new Error('caído');
    await montar();
    expect($('plan-actual')).toBeNull();
  });

  it('elegido otro plan, «Continuar al pago» lleva al pago sin esperar', async () => {
    await montar();
    await act(async () => {
      ($('elegir-pro') as HTMLButtonElement).click();
    });
    const continuar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Continuar al pago'));
    expect(continuar).toBeDefined();
    await act(async () => {
      continuar!.click();
    });
    expect(push).toHaveBeenCalledWith('/panel/checkout?plan=pro&billing=monthly');
  });
});
