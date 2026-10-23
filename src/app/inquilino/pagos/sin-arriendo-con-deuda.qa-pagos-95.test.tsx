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

describe('Pagos · LA RESPUESTA en grande (glow up 22-10)', () => {
  it('con vencido, la cifra grande es lo vencido; la próxima cuota y lo que resta van al pie', async () => {
    mio.mockResolvedValue({});
    resumen.valor = {
      proxima: { valor: 2_100_000, fecha: '2026-11-05', diasQueFaltan: 14 },
      vencidoCop: 6_300_000,
      cuotasVencidas: 3,
      restaPorPagar: 11_830_000,
      enMora: true,
      diasDeMora: 40,
    };
    await montar();
    const cifras = host.querySelector('[data-testid="cifras-de-pagos"]');
    expect(cifras?.textContent).toContain('Tienes vencido');
    expect(cifras?.querySelector('[data-testid="cifra-vencido"]')?.textContent).toMatch(/6\.300\.000/);
    expect(cifras?.querySelector('[data-testid="cifra-proxima-cuota"]')?.textContent).toMatch(/2\.100\.000/);
    expect(cifras?.querySelector('[data-testid="cifra-resta-por-pagar"]')?.textContent).toMatch(/11\.830\.000/);
  });

  it('revisora r25: la cifra trae su barra con lo pagado del contrato, dicho una vez al pie', async () => {
    mio.mockResolvedValue({
      contratos: [
        {
          secciones: {
            arriendos: [
              { estado: 'CANCELADA', valorNeto: 2_100_000 },
              { estado: 'PENDIENTE', valorNeto: 2_100_000 },
              { estado: 'PENDIENTE', valorNeto: 2_100_000 },
            ],
            otrosConceptos: [],
          },
        },
      ],
    });
    resumen.valor = {
      proxima: { valor: 2_100_000, fecha: '2026-11-05', diasQueFaltan: 14 },
      vencidoCop: 2_100_000,
      cuotasVencidas: 1,
      restaPorPagar: 4_200_000,
      enMora: true,
      diasDeMora: 10,
    };
    await montar();
    const cifras = host.querySelector('[data-testid="cifras-de-pagos"]');
    expect(cifras?.querySelector('[role="img"]')).not.toBeNull();
    expect(cifras?.querySelector('[data-testid="cifra-pagado-del-contrato"]')?.textContent).toMatch(
      /Pagado \$\s?2\.100\.000 de \$\s?6\.300\.000 del contrato/,
    );
  });

  it('al día, la cifra grande es la próxima cuota con su vencimiento', async () => {
    mio.mockResolvedValue({});
    resumen.valor = {
      proxima: { valor: 2_100_000, fecha: '2026-11-05', diasQueFaltan: 14 },
      vencidoCop: 0,
      cuotasVencidas: 0,
      restaPorPagar: 4_200_000,
      enMora: false,
      diasDeMora: 0,
    };
    await montar();
    const cifras = host.querySelector('[data-testid="cifras-de-pagos"]');
    expect(cifras?.textContent).toContain('Tu próxima cuota');
    expect(cifras?.querySelector('[data-testid="cifra-proxima-cuota"]')?.textContent).toMatch(/2\.100\.000/);
    expect(cifras?.querySelector('[data-testid="cifra-vencido"]')?.textContent).toContain('Estás al día');
  });
});
