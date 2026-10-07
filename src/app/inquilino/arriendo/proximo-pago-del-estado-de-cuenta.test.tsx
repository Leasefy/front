/**
 * QA-INQ-95 / QA-CONT-95 (04-10-2026) · Contrato #53 de Sofía (del 4 de octubre
 * de 2026 al 3 de octubre de 2027, prorrateado, cuotas que vencen el 1). En la
 * base: la cuota de octubre vence el 4-oct por $1.485.000 (vencida hoy) y la de
 * noviembre el 1-nov por $1.650.000. «Pagos» lo decía bien; «Mi arriendo» decía
 * «Próximo pago $ 1.650.000 · 5 de nov»: leía `/tenant-payments/mine`, cuotas
 * sintéticas armadas con el día pactado (5) del arriendo.
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

import ArriendoPage from './page';
import { I18nProvider } from '@/lib/i18n';
import { proximoPagoDelPortal } from '@/lib/estado-de-cuenta/proximo-pago-del-portal';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

const arriendo = (id: string, contractId: string, titulo: string) => ({
  id,
  contractId,
  propertyId: `inmueble-${id}`,
  landlordId: 'admin',
  tenantId: 'sofia',
  status: 'ACTIVE',
  monthlyRent: 1_650_000,
  adminFee: 0,
  startDate: '2026-10-04T00:00:00.000Z',
  endDate: '2027-10-03T00:00:00.000Z',
  paymentDueDay: 5,
  venceElDia: 1,
  propertyTitle: titulo,
  propertyAddress: titulo,
  propertyCity: 'Medellín',
  propertyThumbnail: null,
  tenantName: 'Sofía',
  tenantEmail: 'sofia@ejemplo.co',
  tenantPhone: '3001112233',
  landlordName: 'Inmobiliaria',
  landlordEmail: 'a@b.co',
  landlordPhone: null,
  contractUrl: null,
  renovacion: null,
  createdAt: '2026-10-04T06:36:15.555Z',
  updatedAt: '2026-10-04T06:36:15.555Z',
});

const fila = (mes: string, vence: string, valor: number, cajon: 'POR_VENCER' | 'VENCIDA_EN_PLAZO') => ({
  concepto: `Canon ${mes}`,
  estado: 'PENDIENTE',
  fechaDePago: null,
  valorBruto: valor,
  iva: 0,
  retencion: 0,
  reteIva: 0,
  reteIca: 0,
  valorNeto: valor,
  fechaVencimiento: vence,
  documentoDePago: null,
  parcial: false,
  cuotaId: `cuota-${mes}`,
  cajon,
});

const contrato = (id: string, numero: string, filas: ReturnType<typeof fila>[]) => ({
  id,
  numero,
  rol: 'INQUILINO',
  inmueble: { direccion: numero },
  vigente: true,
  secciones: { arriendos: filas, otrosConceptos: [] },
  totales: { cancelado: 0, pendiente: 0, restaPorPagar: filas.reduce((s, f) => s + f.valorNeto, 0) },
});

/** El estado de cuenta del portal de Sofía, con las cuotas de la base del laboratorio. */
const DOC = {
  cliente: { nombre: 'Sofía Henao', documento: '1000000053' },
  inmobiliaria: { nombre: 'Inmobiliaria' },
  fecha: '2026-10-04',
  contratos: [
    contrato('contrato-53', '53', [
      fila('2026-10', '2026-10-04', 1_485_000, 'VENCIDA_EN_PLAZO'),
      fila('2026-11', '2026-11-01', 1_650_000, 'POR_VENCER'),
      fila('2026-12', '2026-12-01', 1_650_000, 'POR_VENCER'),
    ]),
  ],
  totales: { cancelado: 0, pendiente: 1_485_000, restaPorPagar: 4_785_000 },
} as unknown as EstadoDeCuenta;

/** Lo que `/tenant-payments/mine` le arma (el modelo viejo): el canon entero, el día 5. */
const DEL_MODELO_VIEJO = [
  { id: 'sint-11', leaseId: 'lease-53', amount: 1_650_000, concept: 'RENT', dueDate: '2026-11-05', status: 'PENDING' },
];

let host: HTMLDivElement;
let root: Root;
let leases: unknown[];
let doc: EstadoDeCuenta;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-04T22:00:00.000Z'), toFake: ['Date'] });
  leases = [arriendo('lease-53', 'contrato-53', 'Carrera 80 # 30-15 Apto 402')];
  doc = DOC;
  apiGet.mockReset();
  apiGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/leases') return leases;
    if (ruta === '/tenant-payments/mine') return DEL_MODELO_VIEJO;
    if (ruta === '/portal/estado-de-cuenta') return doc;
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

async function pintar() {
  await act(async () => {
    root.render(
      <I18nProvider>
        <ArriendoPage />
      </I18nProvider>,
    );
  });
  for (let i = 0; i < 12; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
  return (host.textContent ?? '').replace(/ /g, ' ');
}

describe('«Mi arriendo» · Próximo pago', () => {
  it('sale del estado de cuenta: la cuota de noviembre vence el 1, no el 5', async () => {
    const texto = await pintar();
    expect(texto).toMatch(/\$ ?1\.650\.000 · 1 de nov/);
    expect(texto).not.toMatch(/5 de nov/);
    // Y el estado general dice lo vencido de octubre, prorrateado.
    expect(texto).toContain('1.485.000');
  });

  it('sin estado de cuenta no inventa un próximo pago con el modelo viejo', async () => {
    apiGet.mockImplementation(async (ruta: string) => {
      if (ruta === '/leases') return leases;
      if (ruta === '/tenant-payments/mine') return DEL_MODELO_VIEJO;
      if (ruta === '/portal/estado-de-cuenta') throw new Error('caído');
      throw new Error('sin datos');
    });
    const texto = await pintar();
    expect(texto).toContain('Carrera 80 # 30-15 Apto 402');
    expect(texto).not.toMatch(/5 de nov/);
  });

  it('con dos arriendos, cada tarjeta dice el próximo pago de SU contrato', async () => {
    leases = [
      arriendo('lease-53', 'contrato-53', 'Carrera 80 # 30-15 Apto 402'),
      arriendo('lease-60', 'contrato-60', 'Calle 10 # 43-20 Local 2'),
    ];
    doc = {
      ...DOC,
      contratos: [
        ...DOC.contratos,
        contrato('contrato-60', '60', [fila('2026-10', '2026-10-15', 3_200_000, 'POR_VENCER')]),
      ],
    } as unknown as EstadoDeCuenta;
    const texto = await pintar();
    expect(texto).toMatch(/\$ ?1\.650\.000 · 1 de nov/);
    expect(texto).toMatch(/\$ ?3\.200\.000 · 15 de oct/);
  });
});

describe('proximoPagoDelPortal', () => {
  it('sin contrato, la más cercana de todos; con un contrato que no está, null', () => {
    const conDos = {
      ...DOC,
      contratos: [...DOC.contratos, contrato('contrato-60', '60', [fila('2026-10', '2026-10-15', 3_200_000, 'POR_VENCER')])],
    } as unknown as EstadoDeCuenta;
    expect(proximoPagoDelPortal(conDos, '2026-10-04')).toEqual({ valor: 3_200_000, fecha: '2026-10-15' });
    expect(proximoPagoDelPortal(conDos, '2026-10-04', 'contrato-53')).toEqual({ valor: 1_650_000, fecha: '2026-11-01' });
    expect(proximoPagoDelPortal(conDos, '2026-10-04', 'otro')).toBeNull();
    expect(proximoPagoDelPortal(conDos, '2026-10-04', null)).toBeNull();
  });
});
