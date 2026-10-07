/**
 * D-19 (QA-INQ-95 ronda 2, 04-10-2026) · «Mi arriendo» sólo ofrecía «Aceptar
 * renovación»: para avisar que NO renueva había que entrar al detalle, y un
 * aviso registrado por la inmobiliaria (en el contrato, sin renovación
 * abierta) no se le mostraba al inquilino.
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

async function pintar(arriendo: Record<string, unknown>) {
  apiGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/leases') return [arriendo];
    if (ruta.includes('/payment-info')) throw new Error('sin payment-info en la prueba');
    return [];
  });
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
  return host.textContent ?? '';
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-04T22:00:00.000Z'), toFake: ['Date'] });
  apiGet.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('«Mi arriendo» · avisar que no renueva (D-19)', () => {
  it('desde la lista se puede avisar que no renueva, también con la renovación en curso', async () => {
    const texto = await pintar({
      ...DEL_BACK,
      renovacion: { id: 'r', status: 'RENOV_PENDING', proposedRent: 2_469_850, proposedAdminFee: null, newEndDate: null, tenantAcceptedAt: null, avisoNoRenovar: null },
    });
    expect(texto).toContain('Aceptar renovación');
    expect(host.querySelector('[data-testid="abrir-no-renovar"]')).not.toBeNull();
    // La puerta va FUERA del enlace de la tarjeta: abrirla no navega al detalle.
    expect(host.querySelector('a [data-testid="abrir-no-renovar"]')).toBeNull();
  });

  it('el aviso que registró la inmobiliaria en el contrato se le muestra, sin «Aceptar renovación» ni el botón', async () => {
    const texto = await pintar({
      ...DEL_BACK,
      renovacion: null,
      avisoNoRenovar: { at: '2026-09-01T15:00:00.000Z', por: 'INMOBILIARIA', motivo: 'El propietario vende' },
    });
    expect(texto).not.toContain('Aceptar renovación');
    expect(host.querySelector('[data-testid="abrir-no-renovar"]')).toBeNull();
    expect(texto).toMatch(/inmobiliaria/i);
    expect(texto).toMatch(/no se va a renovar|no vas a renovar/i);
  });
});
