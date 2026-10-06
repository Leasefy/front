/**
 * 🔴 N-31 (QA-FACT-CONTA-95 r3, Nico 06-10-2026, Q12): la nota crédito que
 * dejó lista la terminación de un contrato (la emite el administrador o el
 * contador desde «Notas») dice qué hace antes de emitirla, y al emitirla dice
 * lo que pasó (la factura corregida, si salió).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { emitidas, emitirNotaCredito, emitirNotaGenerada, notasDebito, confirmarMock, descargarUnaMock, notasDelMes, pdfDeLaNota } = vi.hoisted(() => ({
  notasDelMes: vi.fn(),
  pdfDeLaNota: vi.fn(),
  emitidas: vi.fn(),
  emitirNotaCredito: vi.fn(),
  emitirNotaGenerada: vi.fn(),
  notasDebito: vi.fn(),
  confirmarMock: vi.fn(),
  descargarUnaMock: vi.fn(),
}));

vi.mock('./useDescargarFacturas', () => ({
  useDescargarFacturas: () => ({
    descargarUna: (...a: unknown[]) => descargarUnaMock(...a),
    descargarLote: vi.fn(),
    descargando: null,
  }),
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return {
    ...real,
    facturacionPorMesService: { emitidas, emitirNotaCredito, emitirNotaGenerada, notasDelMes, pdfDeLaNota },
  };
});

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-electronica.service')>(
    '@/lib/api/facturacion-electronica.service',
  );
  return { ...real, facturacionElectronicaService: { ...real.facturacionElectronicaService, notasDebito } };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/confirmar', () => ({
  confirmar: (...a: unknown[]) => confirmarMock(...a),
}));

import { FacturasEmitidas } from './FacturasEmitidas';
import { toast } from '@/components/ui/toast';

function factura(over: Record<string, unknown> = {}) {
  return {
    id: 'f-1',
    numero: 3,
    numeroDian: 'LABQA-1',
    destinatario: 'INQUILINO',
    terceroNombre: 'Juliana Sin Correo Patiño',
    terceroDocumento: '43123456',
    inmueble: 'Apartamento 302',
    contractId: 'ct-26',
    mes: '2026-10',
    baseCop: 4_100_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 4_100_000,
    netoCop: 4_100_000,
    createdAt: '2026-10-03T12:00:00.000Z',
    notaCredito: null,
    notasCredito: [],
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(vista: 'ventas' | 'notas', respuesta: Record<string, unknown>) {
  emitidas.mockResolvedValue(respuesta);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<FacturasEmitidas mes="2026-10" vista={vista} />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto, un back sin `notas/lista`: la pestaña Notas se arma como antes.
  notasDelMes.mockRejectedValue(new Error('404'));
  notasDebito.mockResolvedValue({ disponible: true, migracion: null, notas: [], explicacion: null });
  confirmarMock.mockResolvedValue(true);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const q = (s: string) => host.querySelector(s) ?? document.body.querySelector(s);

function notaDelFin(over: Record<string, unknown> = {}) {
  return {
    id: 'nc-fin',
    tipo: 'NOTA_CREDITO',
    numero: null,
    estado: 'GENERADA',
    parcial: false,
    concepto: 'ANULACION',
    conceptoNombre: 'Anulación',
    motivo: 'El contrato terminó el 6 de octubre de 2026.',
    valorCop: 2_900_000,
    baseCop: null,
    ivaCop: null,
    deCobroAnulado: false,
    delFinDelContrato: true,
    creadaAt: '2026-10-06T15:00:00.000Z',
    dia: '2026-10-06',
    factura: {
      id: 'f-11', numeroDian: 'LABQA-11', mes: '2026-10', destinatario: 'INQUILINO',
      terceroNombre: 'Mateo Cardona Ríos', terceroDocumento: null, inmueble: 'Calle 8', contractId: 'ct-8',
    },
    enLaDeuda: null,
    notaContable: null,
    transmision: null,
    entrega: null,
    puedeEmitir: true,
    porQueNoSePuedeEmitir: null,
    tienePdf: false,
    ...over,
  };
}

describe('N-31 · la nota del fin del contrato en «Notas»', () => {
  it('la confirmación dice que es la del fin y que la deuda no cambia; el aviso dice que salió la corregida', async () => {
    notasDelMes.mockResolvedValue({ mes: '2026-10', disponible: true, notas: [notaDelFin()] });
    emitirNotaGenerada.mockResolvedValue({
      id: 'nc-fin',
      numeroDeLaNota: 'NC-20',
      valorCop: 2_900_000,
      explicacion: 'La factura LABQA-11 quedó anulada con la nota NC-20 y salió la corregida LABQA-70 por los días que el contrato cubrió.',
    });
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    await act(async () => {
      (q('[data-testid="emitir-nota-nc-fin"]') as HTMLButtonElement).click();
    });
    const pedido = confirmarMock.mock.calls[0][0] as { titulo: string; descripcion: string };
    expect(pedido.titulo).toContain('LABQA-11');
    expect(pedido.descripcion).toContain('Es la del fin del contrato');
    expect(pedido.descripcion).toContain('La deuda no cambia');
    expect(emitirNotaGenerada).toHaveBeenCalledWith('nc-fin');
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'La factura LABQA-11 quedó anulada con la nota NC-20 y salió la corregida LABQA-70 por los días que el contrato cubrió.',
    );
  });

  it('la de un cobro anulado sigue con su texto de siempre', async () => {
    notasDelMes.mockResolvedValue({
      mes: '2026-10',
      disponible: true,
      notas: [notaDelFin({ id: 'nc-cobro', delFinDelContrato: false, deCobroAnulado: true })],
    });
    emitirNotaGenerada.mockResolvedValue({ id: 'nc-cobro', numeroDeLaNota: 'NC-21', valorCop: 2_900_000, explicacion: 'x' });
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    await act(async () => {
      (q('[data-testid="emitir-nota-nc-cobro"]') as HTMLButtonElement).click();
    });
    expect((confirmarMock.mock.calls[0][0] as { descripcion: string }).descripcion).toContain('Es la de un cobro anulado');
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Nota crédito NC-21 emitida');
  });
});
