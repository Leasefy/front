/**
 * @vitest-environment happy-dom
 *
 * 🔴 LA CONCILIACIÓN DEL RECAUDO DIARIO, como la pidió Vale (Nico, 20-10-2026):
 * contadores (Total registros procesados · Conciliados · Omitidos · Errores de
 * carga · Fallidos de conciliación), pestañas (Todos · Conciliados · Por
 * conciliar · Omitidos · Con error), columnas «Razón» y «Estado conciliado» y
 * el botón «Conciliar» para lo que no se concilió solo.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { DetalleDelArchivo, FilaDelArchivo } from '@/lib/api/tesoreria.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  detalle: vi.fn(),
  conciliar: vi.fn(),
}));

vi.mock('@/lib/api/tesoreria.service', () => ({ tesoreriaApi: { detalleDelArchivo: h.detalle } }));
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: { conciliar: h.conciliar } }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: () => true, isLoading: false }) }));
vi.mock('@/components/inmobiliaria/ReciboPorCliente', () => ({
  ElegirCliente: ({ value }: { value: string | null }) => <p data-testid="cliente-elegido">{value ?? 'ninguno'}</p>,
}));
const toastSuccess = vi.fn();
vi.mock('@/components/ui/toast', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

import { ConciliacionDelArchivo, coincide, contadoresDe, estadoDeLaFila } from './ConciliacionDelArchivo';

function fila(p: Partial<FilaDelArchivo> & { linea: number }): FilaDelArchivo {
  return {
    id: `f${p.linea}`,
    crudo: '',
    referencia: '1036999888',
    referenciaValida: true,
    valorCop: 1_500_000,
    fecha: '2026-10-20',
    secuencia: null,
    oficina: null,
    estado: 'NUEVA',
    motivo: null,
    movimientoId: `m${p.linea}`,
    contractId: null,
    calzaExacto: false,
    movimiento: { estado: 'PENDIENTE', reciboId: null },
    contrato: null,
    ...p,
  };
}

const FILAS: FilaDelArchivo[] = [
  fila({
    linea: 2,
    estadoConciliado: 'CONCILIADO',
    razon: 'Solo, por la cédula (único contrato con deuda) y el valor exacto de una cuota. Recibo de caja emitido.',
    sePuedeConciliar: false,
    contractId: 'c1',
    contrato: { id: 'c1', codigo: '1539', inquilino: 'Diana Prueba', documento: '1036999888', tenantId: 't1' },
    movimiento: { estado: 'CONCILIADO', reciboId: 'r1' },
  }),
  fila({
    linea: 3,
    referencia: '43555111',
    valorCop: 980_000,
    estadoConciliado: 'POR_CONCILIAR',
    razon: 'Se identificó el contrato, pero el valor no es el de una cuota pendiente (puede ser un abono o varios meses): una persona decide.',
    sePuedeConciliar: true,
    contractId: 'c2',
    contrato: { id: 'c2', codigo: '1793', inquilino: 'Jesús Prueba', documento: '43555111', tenantId: 't2' },
  }),
  fila({
    linea: 4,
    estado: 'REPETIDA',
    movimientoId: null,
    movimiento: null,
    estadoConciliado: 'OMITIDO',
    razon: 'Es de antes de que facturaras en Leasefy (corte del 01/10/2026): ese pago se lleva en el sistema anterior y no se aplica aquí.',
    sePuedeConciliar: false,
  }),
  fila({
    linea: 5,
    estado: 'RECHAZADA',
    referencia: null,
    valorCop: 0,
    movimientoId: null,
    movimiento: null,
    estadoConciliado: 'CON_ERROR',
    razon: 'El valor no es un número.',
    sePuedeConciliar: false,
  }),
];

const DETALLE: DetalleDelArchivo = {
  archivo: {
    id: 'a1',
    convenioId: 'cv1',
    convenio: 'Recaudo',
    banco: 'Bancolombia',
    nombre: 'recaudo-20-oct.txt',
    huella: 'x',
    lineas: 7,
    filasValidas: 3,
    filasRechazadas: 1,
    nuevas: 2,
    repetidas: 1,
    totalCop: 3_980_000,
    estado: 'IMPORTADO',
    loteId: null,
    createdAt: '2026-10-20T15:00:00.000Z',
    cargadoPorUserId: 'u1',
  },
  filas: FILAS,
  aplicadas: 1,
  contadores: { procesados: 4, conciliados: 1, porConciliar: 1, omitidos: 1, erroresDeCarga: 1, lineasDeControl: 3 },
};

let root: Root | null = null;
let el: HTMLDivElement | null = null;
beforeEach(() => {
  h.detalle.mockReset().mockResolvedValue(DETALLE);
  h.conciliar.mockReset();
  toastSuccess.mockReset();
});
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
});

async function montar() {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => {
    root!.render(<ConciliacionDelArchivo archivoId="a1" />);
  });
}
const $ = (sel: string) => document.body.querySelector(sel);
const lineas = () => [...el!.querySelectorAll('[data-testid^="linea-"]')].map((n) => n.getAttribute('data-testid'));

describe('la conciliación del archivo (Vale, 20-10)', () => {
  it('los cinco contadores con sus palabras y las líneas de control aparte', async () => {
    await montar();
    const texto = $('[data-testid="contadores-del-archivo"]')!.textContent;
    for (const t of ['Total registros procesados4', 'Conciliados1', 'Omitidos1', 'Errores de carga1', 'Fallidos de conciliación1']) {
      expect(texto).toContain(t);
    }
    expect($('[data-testid="lineas-de-control"]')!.textContent).toContain('3 líneas de control');
  });

  it('cada línea con su «Estado conciliado» y su «Razón»', async () => {
    await montar();
    expect(lineas()).toEqual(['linea-2', 'linea-3', 'linea-4', 'linea-5']);
    const conciliada = $('[data-testid="linea-2"]')!.textContent!;
    expect(conciliada).toContain('Contrato 1539');
    expect(conciliada).toContain('Conciliado');
    expect(conciliada).toContain('Recibo de caja emitido');
    expect($('[data-testid="linea-4"]')!.textContent).toContain('antes de que facturaras en Leasefy');
  });

  it('tocar un contador filtra la tabla como su pestaña', async () => {
    await montar();
    await act(async () => ($('[data-testid="contador-POR_CONCILIAR"]') as HTMLButtonElement).click());
    expect(lineas()).toEqual(['linea-3']);
    await act(async () => ($('[data-testid="contador-CON_ERROR"]') as HTMLButtonElement).click());
    expect(lineas()).toEqual(['linea-5']);
  });

  it('sólo lo que está por conciliar tiene el botón «Conciliar»', async () => {
    await montar();
    expect($('[data-testid="conciliar-linea-3"]')).not.toBeNull();
    for (const l of [2, 4, 5]) expect($(`[data-testid="conciliar-linea-${l}"]`)).toBeNull();
  });

  it('🔴 «Conciliar» trae al inquilino del contrato identificado y emite contra él', async () => {
    h.conciliar.mockResolvedValue({ pago: { recibos: [{ id: 'r9', numero: 88, valorCop: 980_000 }], anticipoCop: 0 } });
    await montar();
    await act(async () => ($('[data-testid="conciliar-linea-3"]') as HTMLButtonElement).click());
    expect($('[data-testid="cliente-elegido"]')!.textContent).toBe('t2');
    expect($('[data-testid="razon-al-conciliar"]')!.textContent).toContain('una persona decide');
    await act(async () => ($('[data-testid="confirmar-conciliar-linea"]') as HTMLButtonElement).click());
    expect(h.conciliar).toHaveBeenCalledWith('m3', { tenantId: 't2' });
    expect(toastSuccess).toHaveBeenCalledWith('Recibo N.º 88 emitido.');
    // Se relee el archivo para que la línea pase a «Conciliado».
    expect(h.detalle).toHaveBeenCalledTimes(2);
  });
});

describe('las reglas de la tabla', () => {
  it('con un back anterior la línea deduce su estado', () => {
    expect(estadoDeLaFila(fila({ linea: 1, movimiento: { estado: 'CONCILIADO', reciboId: 'r' } }))).toBe('CONCILIADO');
    expect(estadoDeLaFila(fila({ linea: 1 }))).toBe('POR_CONCILIAR');
    expect(estadoDeLaFila(fila({ linea: 1, estado: 'REPETIDA' }))).toBe('OMITIDO');
    expect(estadoDeLaFila(fila({ linea: 1, estado: 'RECHAZADA' }))).toBe('CON_ERROR');
    expect(contadoresDe([fila({ linea: 1 }), fila({ linea: 2, estado: 'RECHAZADA' })], 5)).toMatchObject({
      procesados: 2,
      porConciliar: 1,
      erroresDeCarga: 1,
      lineasDeControl: 3,
    });
  });

  it('busca por cédula, contrato, inquilino sin tildes y valor', () => {
    const f = FILAS[1];
    expect(coincide(f, '43555')).toBe(true);
    expect(coincide(f, '1793')).toBe(true);
    expect(coincide(f, 'jesus')).toBe(true);
    expect(coincide(f, '980.000')).toBe(true);
    expect(coincide(f, 'diana')).toBe(false);
  });
});
