/**
 * QA-INQ-95 (PI-08, 04-10-2026) · El detalle del arriendo de Iván decía «Total
 * pagado $10.840.670 · 8 pagos realizados» (suma de solicitudes aprobadas,
 * también las de recibos que la inmobiliaria anuló) cuando su estado de cuenta
 * dice $7.050.000 pagados, «Día de pago Día 5» (el pactado) y un intento
 * rechazado «Vence el 5 de oct». Ahora: lo pagado y las cuotas, del estado de
 * cuenta del contrato; el día, el de la regla de cobro; el rechazado, cuándo lo
 * rechazaron.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ leaseId: 'lease-ivan' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/tenant/PayRentModal', () => ({ PayRentModal: () => null }));
vi.mock('@/components/inquilino/NoVoyARenovar', () => ({ NoVoyARenovar: () => null }));

const LEASE = {
  id: 'lease-ivan', contractId: 'contrato-3', propertyId: 'p', landlordId: 'l', tenantId: 'ivan', status: 'active',
  monthlyRent: 2_350_000, adminFee: 0, startDate: '2025-11-01T00:00:00.000Z', endDate: '2026-10-31T00:00:00.000Z',
  paymentDay: 1, propertyTitle: 'Calle 45 # 70-12 Apto 301', propertyAddress: 'Calle 45 # 70-12 Apto 301', propertyCity: 'Medellín',
  propertyThumbnail: null, tenantName: 'Iván', tenantEmail: 'i@x.co', tenantPhone: '300', landlordName: 'Ana',
  landlordEmail: 'a@x.co', landlordPhone: null, createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z', renovacion: null,
};
const solicitud = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, leaseId: 'lease-ivan', amount: 1_817_112, paymentMethod: 'CARD', periodMonth: 10, periodYear: 2026,
  status, createdAt: '2026-10-04T23:10:00.000Z', updatedAt: '2026-10-04T23:12:00.000Z', validatedAt: null,
  dueDate: '2026-10-05T05:00:00.000Z', referenceNumber: `vencido-${id}`, rejectionReason: null, ...extra,
});
const SOLICITUDES = [
  solicitud('a1', 'APPROVED', { validatedAt: '2026-10-04T23:13:00.000Z' }),
  solicitud('r1', 'REJECTED', { rejectionReason: 'Pago rechazado por la pasarela de pagos' }),
  solicitud('a2', 'APPROVED', { validatedAt: '2026-10-04T20:13:00.000Z' }),
  solicitud('a3', 'APPROVED', { validatedAt: '2026-10-04T19:13:00.000Z' }),
];
vi.mock('@/lib/hooks/useLeases', () => ({
  useLease: () => ({ lease: LEASE, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn() }),
  useMyPaymentRequests: () => ({ getForLease: () => SOLICITUDES, refetch: vi.fn() }),
  useLeasePaymentInfo: () => ({ info: null, refetch: vi.fn() }),
}));

const fila = (mes: number, estado: string, valor: number) => ({
  concepto: `Canon ${mes}`, estado, fechaDePago: null, valorBruto: valor, iva: 0, retencion: 0, reteIva: 0, reteIca: 0,
  valorNeto: valor, fechaVencimiento: `2026-${String(mes).padStart(2, '0')}-01`, documentoDePago: null, parcial: false, cuotaId: `q${mes}`,
});
const DOC = {
  cliente: { nombre: 'Iván', documento: '1037111222' }, inmobiliaria: {}, fecha: '2026-10-04',
  contratos: [{
    id: 'contrato-3', numero: '3', rol: 'INQUILINO', inmueble: { direccion: 'Calle 45' }, vigente: true,
    secciones: { arriendos: [fila(8, 'CANCELADA', 2_350_000), fila(9, 'CANCELADA', 2_350_000), fila(10, 'CANCELADA', 2_350_000), fila(7, 'ANTERIOR', 2_350_000)], otrosConceptos: [] },
    totales: { cancelado: 7_050_000, pendiente: 0, restaPorPagar: 0 },
  }],
  totales: { cancelado: 7_050_000, pendiente: 0, restaPorPagar: 0 },
};
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { mio: () => Promise.resolve(DOC) } }));

import DetalleDelArriendo from './page';
import { I18nProvider } from '@/lib/i18n';

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('el detalle del arriendo', () => {
  it('lo pagado y las cuotas salen del estado de cuenta; el rechazado dice cuándo', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<I18nProvider><DetalleDelArriendo /></I18nProvider>);
    });
    for (let i = 0; i < 10; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const texto = (host.textContent ?? '').replace(/ /g, ' ');
    expect(texto).toMatch(/7\.050\.000/);
    expect(texto).not.toMatch(/7\.268\.448|5\.451\.336/);
    expect(texto).toContain('Cuotas pagadas');
    expect(texto).toMatch(/Rechazado el/);
    expect(texto).not.toMatch(/Vence el 5 de oct/);
    expect(texto).toContain('Día 1');
  });
});
