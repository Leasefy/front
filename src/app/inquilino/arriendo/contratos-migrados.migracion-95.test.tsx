/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — CA-04, decisión de Nico (a):
 * «Mi arriendo» muestra también los contratos del inquilino migrado que no
 * tienen arriendo (el archivo no traía día de pago), encontrados por su
 * identidad. El día de pago que no vino dice «sin definir», nunca un número.
 *
 * Visto en el navegador: Valentina (dos contratos vigentes, deuda en Pagos)
 * leía «No tienes arriendos activos · Cuando firmes un contrato…».
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
vi.mock('@/lib/hooks/use-onboarding-status', () => ({ useOnboardingStatus: () => ({ isComplete: true, isLoading: false }) }));
const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: apiGet, post: vi.fn(), delete: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
vi.mock('@/lib/hooks/useResumenDelPortal', () => ({ useResumenDelPortal: () => null, useEstadoDeCuentaDelPortal: () => null }));

import ArriendoPage from './page';
import { I18nProvider } from '@/lib/i18n';

const CONTRATO = {
  contratoId: 'c-1', numero: '1', inmobiliaria: { id: 'ag-n', nombre: 'ZZ QA Migración 95 N' },
  direccion: 'CL 1 2 3', ciudad: 'Medellín', desde: '2026-02-01', hasta: '2027-01-31', canonCop: 2_500_000, diaDePago: null, estado: 'ACTIVE',
};

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

async function montar(contratos: unknown[]) {
  apiGet.mockReset();
  apiGet.mockImplementation(async (ruta: string) => (ruta.startsWith('/portal/estado-de-cuenta/contratos') ? { contratos } : ruta.startsWith('/leases') ? [] : null));
  act(() => root.render(<I18nProvider><ArriendoPage /></I18nProvider>));
  for (let i = 0; i < 10; i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
}

describe('«Mi arriendo» del inquilino migrado (CA-04)', () => {
  it('muestra el contrato con su inmobiliaria, sus fechas y el día de pago «sin definir»', async () => {
    await montar([CONTRATO]);
    const t = host.textContent ?? '';
    expect(t).not.toContain('No tienes arriendos activos');
    expect(t).toContain('Contrato 1');
    expect(t).toContain('ZZ QA Migración 95 N');
    expect(t).toContain('CL 1 2 3, Medellín');
    expect(host.querySelector('[data-testid="dia-de-pago-c-1"]')?.textContent).toContain('sin definir');
    expect(host.querySelector('a[href="/inquilino/estado-de-cuenta"]')).not.toBeNull();
  });

  it('con el día de pago del archivo, el día', async () => {
    await montar([{ ...CONTRATO, diaDePago: 5 }]);
    expect(host.querySelector('[data-testid="dia-de-pago-c-1"]')?.textContent).toContain('5 de cada mes');
  });

  it('sin contratos ni arriendos, el vacío de siempre', async () => {
    await montar([]);
    expect(host.textContent).toContain('No tienes arriendos activos');
  });
});
