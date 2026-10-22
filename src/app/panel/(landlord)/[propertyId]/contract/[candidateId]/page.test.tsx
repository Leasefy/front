/**
 * GLOW UP (21-10-2026): «Generar el contrato» del propietario independiente
 * con el encabezado común, el Avatar del inquilino y la duración REAL: antes
 * decía «12 meses» siempre, aunque el contrato tuviera otras fechas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Contract } from '@/lib/types/contract';

const { datos } = vi.hoisted(() => ({ datos: { contrato: null as Contract | null } }));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/panel/p1/contract/c1',
}));
vi.mock('@/lib/hooks/useLandlord', () => ({
  useLandlordProperty: () => ({
    property: { id: 'p1', address: 'CL 10 # 43-20 AP 1003', monthlyRent: 2_350_000, title: 'Apto', city: 'Medellín' },
    isLoading: false,
  }),
  useCandidate: () => ({ candidate: { id: 'c1', fullName: 'Ana Pérez' }, isLoading: false }),
}));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => ({ getByPropertyAndTenant: () => datos.contrato, refetch: vi.fn() }),
  useContractActions: () => ({ create: vi.fn(), signAsLandlord: vi.fn() }),
}));
vi.mock('@/components/contract/ContractPreview', () => ({ ContractPreview: () => null }));
vi.mock('@/components/contract/SignatureForm', () => ({ SignatureForm: () => null }));
vi.mock('@/components/contract/InsuranceSelector', () => ({ InsuranceSelector: () => null }));
vi.mock('@/components/contract/AuditTrail', () => ({ AuditTrail: () => null }));

import ContractPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const params = Promise.resolve({ propertyId: 'p1', candidateId: 'c1' });
  await act(async () => {
    root!.render(<ContractPage params={params} />);
  });
  for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.contrato = null;
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('Generar el contrato (propietario independiente)', () => {
  it('el encabezado común y los 12 meses que pacta «Generar»', async () => {
    await montar();
    expect(document.querySelector('header h1')?.textContent).toBe('Generar el contrato');
    expect($('duracion-del-contrato')?.textContent).toBe('12 meses');
    expect(document.body.textContent).toContain('Ana Pérez');
  });

  it('con un contrato, la duración sale de sus fechas', async () => {
    datos.contrato = {
      id: 'k1',
      status: 'pending_landlord',
      startDate: '2026-11-01',
      endDate: '2027-04-30',
      propertyAddress: 'CL 10 # 43-20 AP 1003',
    } as unknown as Contract;
    await montar();
    expect(document.querySelector('header h1')?.textContent).toBe('Contrato de arrendamiento');
    expect($('duracion-del-contrato')?.textContent).toBe('6 meses');
  });
});
