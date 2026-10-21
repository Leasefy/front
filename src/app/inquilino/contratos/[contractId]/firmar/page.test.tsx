/**
 * GLOW UP (21-10-2026): firmar el contrato desde el portal del inquilino.
 *
 *  · el encabezado común, con el chat con la inmobiliaria arriba mientras le toca firmar;
 *  · en el celular la firma queda debajo del contrato entero: «Ir a firmar» lleva a ella;
 *  · en la vista de lectura el chat no se repite (la franja trae el suyo).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

import type { Contract } from '@/lib/types/contract';

const { datos } = vi.hoisted(() => ({
  datos: { contract: null as Contract | null },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/inquilino/contratos/k1/firmar',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContract: () => ({ contract: datos.contract, isLoading: false, error: null }),
  useContractPreview: () => ({ preview: null }),
  useContractRejections: () => ({ rejections: [] }),
  useSignedPdfUrl: () => ({ url: null }),
  useContractActions: () => ({ signAsTenant: vi.fn(), cancel: vi.fn(), rejectAsTenant: vi.fn() }),
}));
vi.mock('@/components/contract/ContractPreview', () => ({ ContractPreview: () => <div data-testid="documento" /> }));
vi.mock('@/components/contract/SignatureForm', () => ({ SignatureForm: () => <div data-testid="formulario-de-firma" /> }));
vi.mock('@/components/contract/AuditTrail', () => ({ AuditTrail: () => null }));
vi.mock('@/components/contract/RejectContractModal', () => ({ RejectContractModal: () => null }));
vi.mock('@/components/contract/CancelContractModal', () => ({ CancelContractModal: () => null }));
vi.mock('@/components/contract/DownloadContractPdfButton', () => ({
  DownloadContractPdfButton: () => <button type="button">PDF</button>,
}));
vi.mock('@/components/inmobiliaria/inventario/FirmaDelInventarioDelInquilino', () => ({
  FirmaDelInventarioDelInquilino: () => null,
}));

import FirmarContractPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function contrato(parcial: Partial<Contract> = {}): Contract {
  return {
    id: 'k1',
    status: 'pending_tenant',
    propertyAddress: 'CL 129 SUR 45-10 AP 1003',
    propertyCity: 'Medellín',
    applicationId: 'app-1',
    tenantName: 'Ana Pérez',
    landlordName: 'Jorge Ruiz',
    tenantSignature: null,
    landlordSignature: null,
    ...parcial,
  } as unknown as Contract;
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  const params = Promise.resolve({ contractId: 'k1' });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <FirmarContractPage params={params} />
      </Suspense>,
    );
  });
  await act(async () => {
    await params;
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.contract = contrato();
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('Firmar el contrato (portal del inquilino)', () => {
  it('el encabezado común dice qué se hace y dónde, con el chat arriba', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Firmar el contrato');
    expect(encabezado?.textContent).toContain('CL 129 SUR 45-10 AP 1003 — Medellín');
    expect($('firmar-abrir-chat')?.getAttribute('href')).toBe('/inquilino/mensajes?applicationId=app-1');
    expect(encabezado?.contains($('firmar-abrir-chat'))).toBe(true);
  });

  it('«Ir a firmar» lleva al formulario de la firma', async () => {
    await montar();
    expect($('ir-a-firmar')?.getAttribute('href')).toBe('#firmar');
    const destino = document.getElementById('firmar');
    expect(destino).not.toBeNull();
    expect(destino?.contains($('formulario-de-firma'))).toBe(true);
  });

  it('en la vista de lectura el chat no se repite en el encabezado', async () => {
    datos.contract = contrato({ status: 'active' } as Partial<Contract>);
    await montar();
    expect(document.querySelector('header h1')?.textContent).toBe('Contrato de arrendamiento');
    expect($('firmar-abrir-chat')).toBeNull();
    expect($('ir-a-firmar')).toBeNull();
  });

  it('vuelve a Mis contratos', async () => {
    await montar();
    expect($('firmar-volver')?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/contratos');
  });
});
