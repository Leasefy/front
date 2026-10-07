/**
 * 🔴 ARREGLOS-6b (Nico, Q1 a: «alinear la fila del front con la regla del
 * back»): la fila deja de ofrecer el 1:1 sólo cuando el back dice que recibos
 * YA EMITIDOS respaldan la línea con SU regla (la misma persona del 1:1, o que
 * la línea misma nombra). Un recibo de OTRA persona que sólo empata en el valor
 * (la mejor propuesta suma exacto, pero `recibosYaEmitidos: null`) ya no quita
 * las cuotas ni «Conciliar con un cliente». Si los recibos no son una propuesta
 * de muchos a uno, la fila ofrece conciliar con ellos. Un back anterior (sin el
 * campo) sigue con el criterio de antes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario, PropuestaMuchosAUno } from '@/lib/api/conciliacion-bancaria.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { salidas, conciliacion, toastMock, permisos } = vi.hoisted(() => ({
  salidas: {
    propuestas: vi.fn(),
    avisos: vi.fn(),
    conciliar: vi.fn(),
    seguras: vi.fn(),
    aplicarSeguras: vi.fn(),
    desvincular: vi.fn(),
  },
  conciliacion: { conciliarConRecibos: vi.fn(), esElGiroDeLeasefy: vi.fn(), recibosQueSuman: vi.fn() },
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
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: conciliacion }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));

import { Table, TableBody } from '@/components/ui/table';
import { MovimientoFila } from './MovimientoFila';
import { SalidasDeLaPagina } from './SalidasDelExtracto';
import { losRecibosNumero, yaLaRespaldanRecibosEmitidos } from './muchos-a-uno';

const CANDIDATO = {
  contractId: 'ct-9',
  tenantId: 't-9',
  tenantName: 'Laura Pérez Gómez',
  propertyTitle: 'Apto 301',
  meses: ['2026-10'],
  pendienteCop: 1_800_000,
  cuotaIds: ['q-9'],
  cobroId: null,
  adelanto: false,
  puntaje: 90,
  porQue: ['La línea trae la referencia de recaudo del contrato.'],
  seguro: true,
};

/** La mejor propuesta: el recibo de OTRA persona del mismo valor (sólo el valor). */
const DE_OTRA_PERSONA = {
  reciboIds: ['r-jorge'],
  recibos: [
    {
      id: 'r-jorge',
      numero: 77,
      valorCop: 1_800_000,
      fecha: '2026-09-30',
      medio: 'transferencia',
      tenantName: 'Jorge Ramírez Ospina',
      propertyTitle: 'Casa 12',
      pagador: null,
    },
  ],
  sumaCop: 1_800_000,
  diferencia: null,
  confianza: 0.3,
  nivel: 'baja',
  deCadaDiez: 3,
  unica: false,
  porQue: ['Suma exacta.'],
} as unknown as PropuestaMuchosAUno;

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-10-02T00:00:00.000Z',
    valorCop: 1_800_000,
    descripcion: 'PAGO PSE REF 10061234',
    referencia: null,
    extractoNombre: 'oct.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-10-02T00:00:00.000Z',
    candidatos: [CANDIDATO] as never,
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
  conciliacion.conciliarConRecibos.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function pintar(m: MovimientoBancario, onCambio = vi.fn()) {
  await act(async () => {
    raiz.render(
      <SalidasDeLaPagina movimientos={[m]}>
        <Table>
          <TableBody>
            <MovimientoFila
              movimiento={m}
              ocupado={false}
              puedeConciliar
              puedeEditar
              onConciliar={() => {}}
              onConciliarConCliente={() => {}}
              onIgnorar={() => {}}
              onReabrir={() => {}}
              onCambio={onCambio}
            />
          </TableBody>
        </Table>
      </SalidasDeLaPagina>,
    );
  });
  await act(async () => {});
  return onCambio;
}

const q = (sel: string) => contenedor.querySelector(sel) as HTMLElement | null;

describe('🔴 ARREGLOS-6b (Q1 a) — la fila con la regla del back', () => {
  it('el recibo de OTRA persona que sólo empata en el valor ya no quita el 1:1 (el back dice `null`)', async () => {
    await pintar(
      movimiento({ muchosAUno: { mejor: DE_OTRA_PERSONA, ambigua: false, total: 1, parcial: null, recibosYaEmitidos: null } }),
    );
    expect(q('[data-testid="sin-uno-a-uno-m-1"]')).toBeNull();
    expect(q('[data-testid="candidato-m-1-ct-9"]')).not.toBeNull();
    expect(q('[data-testid="conciliar-cliente-m-1"]')).not.toBeNull();
  });

  it('el recibo de la MISMA persona (de una propuesta): sin 1:1, y dice cuál', async () => {
    await pintar(
      movimiento({
        muchosAUno: {
          mejor: DE_OTRA_PERSONA,
          ambigua: true,
          total: 2,
          parcial: null,
          recibosYaEmitidos: { deLaPropuesta: true, reciboIds: ['r-oficina'], numeros: [41] },
        },
      }),
    );
    expect(q('[data-testid="candidato-m-1-ct-9"]')).toBeNull();
    expect(q('[data-testid="conciliar-cliente-m-1"]')).toBeNull();
    expect(q('[data-testid="sin-uno-a-uno-m-1"]')?.textContent).toContain('El recibo N.º 41 ya está emitido y suma exacto');
    expect(q('[data-testid="sin-uno-a-uno-m-1"]')?.textContent).toContain('emitiría otro recibo por la misma plata');
    expect(q('[data-testid="conciliar-con-los-recibos-m-1"]')).toBeNull();
  });

  it('recibos del mismo cliente que no son una propuesta: los dice y concilia con ellos sin emitir nada', async () => {
    conciliacion.conciliarConRecibos.mockResolvedValue({ movimiento: movimiento(), recibos: [], vinculos: [] });
    const onCambio = await pintar(
      movimiento({
        muchosAUno: {
          mejor: null,
          ambigua: false,
          total: 0,
          parcial: null,
          recibosYaEmitidos: { deLaPropuesta: false, reciboIds: ['r-52', 'r-51'], numeros: [52, 51] },
        },
      }),
    );
    expect(q('[data-testid="candidato-m-1-ct-9"]')).toBeNull();
    expect(q('[data-testid="sin-uno-a-uno-m-1"]')?.textContent).toContain(
      'Los recibos N.º 51 y 52 de este cliente ya están emitidos y suman exacto este movimiento',
    );
    await act(async () => {
      q('[data-testid="conciliar-con-los-recibos-m-1"]')!.click();
    });
    expect(conciliacion.conciliarConRecibos).toHaveBeenCalledWith('m-1', ['r-52', 'r-51']);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Movimiento conciliado con los recibos N.º 51 y 52. No se emitió ningún recibo nuevo.',
    );
    expect(onCambio).toHaveBeenCalled();
  });

  it('un back anterior (sin el campo) sigue con el criterio de antes', () => {
    expect(yaLaRespaldanRecibosEmitidos({ valorCop: 1_800_000, muchosAUno: { mejor: DE_OTRA_PERSONA } })).toBe(true);
    expect(
      yaLaRespaldanRecibosEmitidos({ valorCop: 1_800_000, muchosAUno: { mejor: DE_OTRA_PERSONA, recibosYaEmitidos: null } }),
    ).toBe(false);
    expect(losRecibosNumero([3, 1, 2])).toBe('los recibos N.º 1, 2 y 3');
  });
});
