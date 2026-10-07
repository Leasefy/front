/**
 * 🔴 N-21 (QA-PAGOS-95, 05-10-2026): en el lab, un inquilino con cuenta y un
 * contrato vigente SIN arriendo del portal (migrado o invitado después) debía
 * $6.300.000 vencidos y «Pagos» le decía «Sin pagos por ahora · Cuando tengas
 * un arriendo activo…», mientras «Mi estado de cuenta» mostraba la deuda. El
 * resumen sale del estado de cuenta (el contrato); sin arriendo el pago en
 * línea todavía no aplica, y se dice con cómo pagar.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/inquilino/pagos',
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({ useOnboardingStatus: () => ({ isComplete: true, isLoading: false }) }));
vi.mock('@/components/tenant/MediosDePagoDeLaInmobiliaria', () => ({ MediosDePagoDeLaInmobiliaria: () => <div data-testid="como-pagar" /> }));
vi.mock('@/components/tenant/AutopagoSection', () => ({ AutopagoSection: () => null }));
vi.mock('@/components/tenant/PayRentModal', () => ({ PayRentModal: () => null }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/hooks/useLeases', () => ({
  // Sin arriendo del portal: el contrato existe, el arriendo no.
  useLeases: () => ({ leases: [], isLoading: false, error: null, errorCrudo: null, refetch: vi.fn(), getActive: () => [] }),
  useMyPaymentRequests: () => ({ requests: [], isLoading: false, error: null, errorCrudo: null, refetch: vi.fn() }),
  useLeasePaymentInfo: () => ({ info: null, isLoading: false, error: null, refetch: vi.fn() }),
}));
const loQueSePuedePagar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/pago-en-linea.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/pago-en-linea.service')>()),
  pagoEnLineaApi: { loQueSePuedePagar, recibo: vi.fn() },
}));
const mio = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { mio } }));
const resumen = vi.hoisted(() => ({ valor: null as unknown }));
vi.mock('@/lib/estado-de-cuenta/resumen-de-pagos', async (original) => ({
  ...(await original<typeof import('@/lib/estado-de-cuenta/resumen-de-pagos')>()),
  resumenDePagos: () => resumen.valor,
}));

import PagosPage from './page';
import { I18nProvider } from '@/lib/i18n';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  loQueSePuedePagar.mockReset();
  mio.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar() {
  act(() => {
    root.render(
      <I18nProvider>
        <PagosPage />
      </I18nProvider>,
    );
  });
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

describe('N-21 · Pagos sin arriendo del portal', () => {
  it('🔴 con contrato y deuda: la deuda y cómo pagar, nunca «Sin pagos por ahora»', async () => {
    mio.mockResolvedValue({});
    resumen.valor = { proxima: null, vencidoCop: 6_300_000, cuotasVencidas: 3, restaPorPagar: 11_830_000, enMora: true, diasDeMora: 40 };
    await montar();
    const texto = host.textContent ?? '';
    expect(texto).not.toContain('Sin pagos por ahora');
    expect(host.querySelector('[data-testid="sin-pago-en-linea"]')?.textContent).toContain(
      'El pago en línea todavía no está disponible para tu contrato',
    );
    expect(host.querySelector('[data-testid="como-pagar"]')).not.toBeNull();
    // Sin arriendo no se ofrece el pago en línea (va por el arriendo).
    expect(loQueSePuedePagar).not.toHaveBeenCalled();
  });

  it('sin contrato (el estado de cuenta no existe): el vacío de siempre', async () => {
    mio.mockRejectedValue(Object.assign(new Error('Ese inquilino todavía no tiene contratos'), { status: 404 }));
    resumen.valor = null;
    await montar();
    expect(host.textContent ?? '').toContain('Sin pagos por ahora');
  });
});
