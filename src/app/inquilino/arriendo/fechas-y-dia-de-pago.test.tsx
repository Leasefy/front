/**
 * QA-INQ-95 (04-10-2026) · «Mi arriendo» de Iván (contrato del 1 de noviembre de
 * 2025 al 31 de octubre de 2026, cuotas que vencen el 1 de cada mes) decía:
 *   - «31 de oct de 2025 → 30 de oct de 2026» y «Vencimiento 30 de oct»: el
 *     `2025-11-01T00:00:00.000Z` del back leído como instante es el 31 de
 *     octubre en Colombia;
 *   - «Día de pago: Sin definir»: el back mandaba `paymentDueDay` y el front
 *     leía `paymentDay` (y el día pactado, 5, tampoco es el del vencimiento).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/inquilino/arriendo',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ isComplete: true, isLoading: false }),
}));

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: apiGet, post: vi.fn(), delete: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
vi.mock('@/lib/hooks/useResumenDelPortal', () => ({
  useResumenDelPortal: () => null,
  useEstadoDeCuentaDelPortal: () => null,
}));

import ArriendoPage from './page';
import { I18nProvider } from '@/lib/i18n';
import { leasesApi } from '@/lib/api/leases.service';

/** Lo que `GET /leases` le manda hoy al inquilino (contrato #3 del lab). */
const DEL_BACK = {
  id: 'lease-ivan',
  contractId: 'contrato-3',
  propertyId: 'inmueble-1',
  landlordId: 'admin',
  tenantId: 'ivan',
  status: 'ACTIVE',
  monthlyRent: 2_350_000,
  adminFee: 0,
  startDate: '2025-11-01T00:00:00.000Z',
  endDate: '2026-10-31T00:00:00.000Z',
  paymentDueDay: 5,
  venceElDia: 1,
  propertyTitle: 'Calle 45 # 70-12 Apto 301',
  propertyAddress: 'Calle 45 # 70-12 Apto 301',
  propertyCity: 'Medellín',
  propertyThumbnail: null,
  tenantName: 'Iván',
  tenantEmail: 'ivan@ejemplo.co',
  tenantPhone: '3001112233',
  landlordName: 'Inmobiliaria',
  landlordEmail: 'a@b.co',
  landlordPhone: null,
  contractUrl: null,
  renovacion: null,
  createdAt: '2026-10-03T06:36:15.555Z',
  updatedAt: '2026-10-03T06:36:15.555Z',
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-04T22:00:00.000Z'), toFake: ['Date'] });
  apiGet.mockReset();
  apiGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/leases') return [DEL_BACK];
    if (ruta.includes('/payment-info')) throw new Error('sin payment-info en la prueba');
    return [];
  });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('el mapeo del arriendo', () => {
  it('el día que se muestra es el del vencimiento de la cuota, no el pactado', async () => {
    const [arriendo] = await leasesApi.getMine();
    expect(arriendo.paymentDay).toBe(1);
  });

  it('un back anterior (sin venceElDia) usa el pactado de paymentDueDay', async () => {
    apiGet.mockImplementation(async () => [{ ...DEL_BACK, venceElDia: undefined }]);
    const [arriendo] = await leasesApi.getMine();
    expect(arriendo.paymentDay).toBe(5);
  });
});

describe('«Mi arriendo»', () => {
  it('muestra la vigencia del contrato como días y el día de pago', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <ArriendoPage />
        </I18nProvider>,
      );
    });
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }
    const texto = host.textContent ?? '';
    expect(texto).toContain('Calle 45 # 70-12 Apto 301');
    expect(texto).toMatch(/1 de nov\.? de 2025/);
    expect(texto).toMatch(/31 de oct\.? de 2026/);
    expect(texto).not.toMatch(/30 de oct\.? de 2026/);
    expect(texto).toContain('Día 1');
    expect(texto).not.toContain('Sin definir');
  });
});
