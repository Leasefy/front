/**
 * QA-INQ-95 (04-10-2026) · Pago real en el sandbox de Wompi: al volver al
 * portal el back confirmó el pago (la cuota de agosto quedó pagada), las
 * tarjetas de arriba se actualizaron, pero «Pagar lo vencido» siguió diciendo
 * «Tu pago está en verificación» y ofreciendo agosto + octubre: el efecto del
 * retorno corre al montar, cuando el arriendo todavía no había llegado, y
 * recargaba con un `cargarPagoEnLinea` sin arriendo.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('id=12096553-1791155875-83162&env=test'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/inquilino/pagos',
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({ useOnboardingStatus: () => ({ isComplete: true, isLoading: false }) }));
vi.mock('@/components/tenant/MediosDePagoDeLaInmobiliaria', () => ({ MediosDePagoDeLaInmobiliaria: () => null }));
vi.mock('@/components/tenant/AutopagoSection', () => ({ AutopagoSection: () => null }));
vi.mock('@/components/tenant/PayRentModal', () => ({ PayRentModal: () => null }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const LEASE = {
  id: 'lease-ivan', contractId: 'c3', propertyId: 'p', landlordId: 'l', tenantId: 'ivan', status: 'active',
  monthlyRent: 2_350_000, startDate: '2025-11-01', endDate: '2026-10-31', paymentDay: 1,
  propertyTitle: 'Calle 45 # 70-12 Apto 301', propertyAddress: 'Calle 45 # 70-12 Apto 301', propertyCity: 'Medellín',
  propertyThumbnail: null, tenantName: 'Iván', tenantEmail: 'i@x.co', tenantPhone: '300', landlordName: 'A',
  landlordEmail: 'a@x.co', landlordPhone: null, createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
};
vi.mock('@/lib/hooks/useLeases', async () => {
  const R = await import('react');
  return {
    // El arriendo llega DESPUÉS del primer render, como en el navegador.
    useLeases: () => {
      const [leases, setLeases] = R.useState<unknown[]>([]);
      R.useEffect(() => {
        const t = setTimeout(() => setLeases([LEASE]), 20);
        return () => clearTimeout(t);
      }, []);
      return { leases, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn(), getActive: () => leases };
    },
    useMyPaymentRequests: () => ({ requests: [], isLoading: false, error: null, errorCrudo: null, refetch: vi.fn() }),
    useLeasePaymentInfo: () => ({ info: null, isLoading: false, error: null, refetch: vi.fn() }),
  };
});

const loQueSePuedePagar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/pago-en-linea.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/pago-en-linea.service')>()),
  pagoEnLineaApi: { loQueSePuedePagar, recibo: vi.fn() },
}));
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: { mio: () => Promise.reject(new Error('no hace falta en esta prueba')) },
}));
const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: vi.fn(), post, getBlob: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import PagosPage from './page';
import { I18nProvider } from '@/lib/i18n';

const cuota = (mes: string, valorCop: number) => ({ id: `q-${mes}`, cuotaId: `q-${mes}`, mes, vence: `${mes}-01`, vencida: true, valorCop, interesCop: 0 });
const ANTES = {
  aplica: true,
  cuotas: [cuota('2026-08', 1_000_000), cuota('2026-10', 1_817_112)],
  totalVencidoCop: 2_817_112,
  enVerificacion: { solicitudId: 's1', valorCop: 1_000_000, desde: '2026-10-04T23:17:44Z' },
  ultimoRechazo: null,
};
const DESPUES = { aplica: true, cuotas: [cuota('2026-10', 1_817_112)], totalVencidoCop: 1_817_112, enVerificacion: null, ultimoRechazo: null };

let host: HTMLDivElement;
let root: Root;
let confirmado = false;
beforeEach(() => {
  confirmado = false;
  loQueSePuedePagar.mockReset();
  loQueSePuedePagar.mockImplementation(async () => (confirmado ? DESPUES : ANTES));
  post.mockReset();
  // El back confirma el pago a los 100 ms (después de que llegó el arriendo).
  post.mockImplementation(
    () =>
      new Promise((r) =>
        setTimeout(() => {
          confirmado = true;
          r({ transaccionId: 'tx', estado: 'APROBADO', leaseId: 'lease-ivan', periodo: { mes: 8, anio: 2026 }, mensaje: 'Tu pago quedó confirmado.' });
        }, 100),
      ),
  );
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('al volver de Wompi', () => {
  it('«Pagar lo vencido» se vuelve a leer con lo que confirmó el back', async () => {
    act(() => {
      root.render(
        <I18nProvider>
          <PagosPage />
        </I18nProvider>,
      );
    });
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }
    expect(post).toHaveBeenCalled();
    expect(loQueSePuedePagar.mock.calls.length).toBeGreaterThanOrEqual(2);
    const seccion = host.querySelector('[data-testid="pagar-lo-vencido"]')?.textContent ?? '';
    expect(seccion).not.toContain('en verificación');
    expect(seccion).not.toContain('agosto');
    expect(seccion).toContain('octubre');
  });
});
