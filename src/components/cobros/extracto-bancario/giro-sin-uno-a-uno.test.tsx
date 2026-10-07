/**
 * 🔴 ARREGLOS-6b (Nico, ARREGLOS-5 Q4 a): la línea que es el GIRO DE LEASEFY
 * (el neto de una liquidación del recaudo en línea) no ofrece las cuotas del
 * 1:1 ni «Conciliar con un cliente»: sus recibos se emitieron con cada pago en
 * línea, y cualquiera de los dos emitiría otro recibo por la misma plata. La
 * fila dice por qué; se confirma con «Es el giro de Leasefy». Las demás líneas
 * siguen como siempre.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario, PropuestaDelGiro } from '@/lib/api/conciliacion-bancaria.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { salidas, toastMock, permisos } = vi.hoisted(() => ({
  salidas: {
    propuestas: vi.fn(),
    avisos: vi.fn(),
    conciliar: vi.fn(),
    seguras: vi.fn(),
    aplicarSeguras: vi.fn(),
    desvincular: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: {
    canAccess: vi.fn((_m: string, _a: string) => true),
    isLoading: false,
    isAdmin: true,
    agencyRole: 'ADMIN' as string | null,
  },
}));

vi.mock('@/lib/api/salidas-del-extracto', async (original) => ({
  ...(await original<typeof import('@/lib/api/salidas-del-extracto')>()),
  salidasDelExtractoApi: salidas,
}));
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({
  conciliacionBancariaApi: { esElGiroDeLeasefy: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));

import { Table, TableBody } from '@/components/ui/table';
import { MovimientoFila } from './MovimientoFila';
import { SalidasDeLaPagina } from './SalidasDelExtracto';

const GIRO: PropuestaDelGiro = {
  tipo: 'liquidacion',
  liquidacionId: 'liq-1',
  numero: 'LIQ-LAB-0001',
  referenciaDelGiro: 'LEASEFY LIQ-LAB-0001',
  fechaDelGiro: '2026-10-03',
  brutoCop: 1_500_000,
  netoCop: 1_446_450,
  cantidadDePagos: 1,
  descuentos: [{ concepto: 'Comisión de Wompi', valorCop: 53_550, fuente: 'reporte-de-wompi' }],
  diferenciaCop: 53_550,
  documentadaPorLaFuente: true,
  conLaReferencia: false,
  confianza: 'media',
  aplicableSola: false,
  porQue: ['El neto de la liquidación es exacto el valor de la línea.'],
} as PropuestaDelGiro;

const CANDIDATO = {
  contractId: 'ct-9',
  tenantId: 't-9',
  tenantName: 'Laura Pérez Gómez',
  propertyTitle: 'Apto 301',
  meses: ['2026-10'],
  pendienteCop: 1_446_450,
  cuotaIds: ['q-9'],
  cobroId: null,
  adelanto: false,
  puntaje: 60,
  porQue: ['El valor es igual a lo pendiente de la cuota de octubre de 2026.'],
  seguro: false,
};

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-giro',
    agencyId: 'a-1',
    fecha: '2026-10-03T00:00:00.000Z',
    valorCop: 1_446_450,
    descripcion: 'ABONO LEASEFY SAS',
    referencia: null,
    extractoNombre: 'oct.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-10-03T00:00:00.000Z',
    candidatos: [],
    recibo: null,
    cuenta: null,
    deLaPasarela: false,
    pasarela: null,
    ...sobre,
  } as MovimientoBancario;
}

let raiz: Root;
let contenedor: HTMLDivElement;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  salidas.propuestas.mockResolvedValue({ sePuedeAplicar: true, porMovimiento: {} });
  salidas.avisos.mockResolvedValue({ avisos: [], hasta: null });
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function pintar(movs: MovimientoBancario[]) {
  await act(async () => {
    raiz.render(
      <SalidasDeLaPagina movimientos={movs}>
        <Table>
          <TableBody>
            {movs.map((m) => (
              <MovimientoFila
                key={m.id}
                movimiento={m}
                ocupado={false}
                puedeConciliar
                puedeEditar
                onConciliar={() => {}}
                onConciliarConCliente={() => {}}
                onIgnorar={() => {}}
                onReabrir={() => {}}
              />
            ))}
          </TableBody>
        </Table>
      </SalidasDeLaPagina>,
    );
  });
  await act(async () => {});
}

const q = (sel: string) => contenedor.querySelector(sel) as HTMLElement | null;

describe('🔴 ARREGLOS-6b — la línea del giro de Leasefy no ofrece el 1:1', () => {
  it('sin candidatos: no ofrece «Conciliar con un cliente» y dice por qué; ofrece confirmar el giro', async () => {
    await pintar([movimiento({ giroDeLeasefy: { propuestas: [GIRO] } })]);
    expect(q('[data-testid="giro-de-leasefy-m-giro"]')).not.toBeNull();
    expect(q('[data-testid="es-el-giro-de-leasefy-m-giro"]')).not.toBeNull();
    expect(q('[data-testid="conciliar-cliente-m-giro"]')).toBeNull();
    expect(q('[data-testid="sin-uno-a-uno-m-giro"]')?.textContent).toContain(
      'emitiría otro recibo por la misma plata',
    );
  });

  it('aunque llegaran candidatos (un back anterior), no se muestran las cuotas ni «Ninguno: conciliar con un cliente»', async () => {
    await pintar([movimiento({ giroDeLeasefy: { propuestas: [GIRO] }, candidatos: [CANDIDATO] as never })]);
    expect(q('[data-testid="candidato-m-giro-ct-9"]')).toBeNull();
    expect(q('[data-testid="conciliar-cliente-m-giro"]')).toBeNull();
  });

  it('una línea que NO es el giro sigue ofreciendo sus cuotas y el cliente', async () => {
    await pintar([movimiento({ id: 'm-laura', descripcion: 'TRANSFERENCIA LAURA PEREZ', candidatos: [CANDIDATO] as never })]);
    expect(q('[data-testid="candidato-m-laura-ct-9"]')).not.toBeNull();
    expect(q('[data-testid="conciliar-cliente-m-laura"]')).not.toBeNull();
    expect(q('[data-testid="sin-uno-a-uno-m-laura"]')).toBeNull();
  });
});
