/**
 * 🔴 Decisión 3 del 05-10-2026 (FALTANTES): /upgrade y /checkout se cierran.
 * El plan lo cambia sólo Leasefy desde /admin: las dos pantallas dicen «Habla
 * con Leasefy», sin escoger plan ni pagar, y las ve cualquier miembro.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { sub } = vi.hoisted(() => ({
  sub: { currentPlan: { name: 'Pro' } as { name: string } | null, subscriptionStatus: 'ACTIVE' as string | null, indeterminate: false },
}));
vi.mock('@/lib/hooks/useAgencySubscription', () => ({ useAgencySubscription: () => sub }));
vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }));

import AgencyUpgradePage from './page';
import AgencyCheckoutPage from '../checkout/page';
import { textoDelEstadoDelPlan } from '@/components/inmobiliaria/plan/HablaConLeasefy';

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

describe('Habla con Leasefy', () => {
  it.each([
    ['/upgrade', AgencyUpgradePage],
    ['/checkout', AgencyCheckoutPage],
  ])('%s dice el plan y cómo pedir el cambio, sin escoger ni pagar', async (_ruta, Pagina) => {
    await act(async () => root.render(<Pagina />));
    expect(host.querySelector('h1')!.textContent).toBe('Habla con Leasefy');
    expect(host.querySelector('[data-testid="habla-con-leasefy-plan"]')!.textContent).toBe('Tu inmobiliaria está en el plan Pro.');
    expect(host.textContent).toMatch(/desde aquí no se escoge ni se paga/);
    const correo = host.querySelector('[data-testid="habla-con-leasefy-correo"]') as HTMLAnchorElement;
    expect(correo.getAttribute('href')).toMatch(/^mailto:hola@leasefy\.co\?subject=/);
    expect(host.textContent).not.toMatch(/Seleccionar plan|Pagar|Wompi|Activar plan/);
  });

  it('las páginas no cobran ni piden el plan: nada de checkout, Wompi ni PageGuard de administrador', () => {
    for (const rel of ['./page.tsx', '../checkout/page.tsx']) {
      const fuente = readFileSync(resolve(__dirname, rel), 'utf8');
      expect(fuente).not.toMatch(/useAgencyCheckout|AgencyCheckoutOverlay|PricingTable|selectPlan|adminOnly/);
    }
  });

  it('mientras la suscripción o el catálogo cargan no dice nada del plan (nunca «no tiene plan» por adelantado)', async () => {
    sub.indeterminate = true;
    sub.currentPlan = null;
    await act(async () => root.render(<AgencyUpgradePage />));
    expect(host.querySelector('[data-testid="habla-con-leasefy-plan"]')).toBeNull();
    expect(host.textContent).not.toMatch(/todavía no tiene un plan/);
    sub.indeterminate = false;
    sub.currentPlan = { name: 'Pro' };
  });

  it('un plan pausado lo dice', () => {
    expect(textoDelEstadoDelPlan({ nombre: 'Pro', estado: 'SUSPENDED' })).toBe(
      'El plan Pro de tu inmobiliaria está pausado. Escríbenos y lo resolvemos contigo.',
    );
    expect(textoDelEstadoDelPlan({ nombre: null, estado: null })).toBe('Tu inmobiliaria todavía no tiene un plan registrado.');
  });
});
