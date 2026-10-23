/**
 * GLOW UP (21-10-2026): en el detalle del arriendo, pagar el mes es lo que más
 * se viene a hacer, así que va primero, antes de la renovación (que sigue ahí,
 * con su «No voy a renovar» debajo). La vuelta lleva a «Mi arriendo».
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ leaseId: 'lease-1' }), useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/tenant/PayRentModal', () => ({ PayRentModal: () => null }));
vi.mock('@/components/inquilino/NoVoyARenovar', () => ({ NoVoyARenovar: () => <div data-testid="no-voy-a-renovar" /> }));

const LEASE = {
  id: 'lease-1', contractId: 'contrato-1', propertyId: 'p', landlordId: 'l', tenantId: 't', status: 'ending_soon',
  monthlyRent: 2_350_000, adminFee: 0, startDate: '2025-11-01T00:00:00.000Z', endDate: '2026-11-15T00:00:00.000Z',
  paymentDay: 5, propertyTitle: 'Calle 45 # 70-12 Apto 1003', propertyAddress: 'Calle 45 # 70-12 Apto 1003', propertyCity: 'Medellín',
  propertyThumbnail: null, tenantName: 'Iván', tenantEmail: 'i@x.co', tenantPhone: '300', landlordName: 'Ana',
  landlordEmail: 'a@x.co', landlordPhone: null, createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z', renovacion: null,
};
const INFO = {
  monthlyRent: 2_350_000,
  currentPeriod: { month: 10, year: 2026 },
  currentPeriodStatus: 'NONE',
  currentPeriodRejectionReason: null,
};
vi.mock('@/lib/hooks/useLeases', () => ({
  useLease: () => ({ lease: LEASE, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn() }),
  useMyPaymentRequests: () => ({ getForLease: () => [], refetch: vi.fn() }),
  useLeasePaymentInfo: () => ({ info: INFO, refetch: vi.fn() }),
}));
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: { mio: () => Promise.resolve({ contratos: [], totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 } }) },
}));

import DetalleDelArriendo from './page';
import { I18nProvider } from '@/lib/i18n';

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function boton(texto: string): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(texto));
}

describe('el detalle del arriendo — en el orden del trabajo', () => {
  it('«Pagar arriendo» va antes que «Quiero renovar», y la vuelta lleva a Mi arriendo', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<I18nProvider><DetalleDelArriendo /></I18nProvider>);
    });
    for (let i = 0; i < 10; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)); });

    const pagar = boton('Pagar arriendo');
    const renovar = boton('Quiero renovar');
    expect(pagar).toBeDefined();
    expect(renovar).toBeDefined();
    expect(pagar!.compareDocumentPosition(renovar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const volver = Array.from(host.querySelectorAll('a')).find((a) => a.textContent?.includes('Volver a Mi arriendo'));
    expect(volver?.getAttribute('href')).toBe('/inquilino/arriendo');

    // QA 21-10 en el laboratorio: sin filas vacías ni promesas que nadie verifica.
    const $ = (id: string) => host.querySelector(`[data-testid="${id}"]`);
    expect(host.textContent).toContain('Quién administra tu arriendo');
    expect(host.textContent).not.toContain('Propietario verificado');
    expect($('contacto-correo')).not.toBeNull();
    expect($('contacto-telefono')).toBeNull(); // sin teléfono, sin fila
    expect($('garantia-del-arriendo')).toBeNull(); // el back no la manda
    // (el `next/link` de prueba no pasa el data-testid: se busca por el texto)
    const documentos = Array.from(host.querySelectorAll('a')).find((a) => a.textContent?.includes('Ver tu contrato y documentos'));
    expect(documentos?.getAttribute('href')).toBe('/inquilino/contratos');
  });
});
