/**
 * C2-AGREGADOR (Nico, P2): «Es el giro de Leasefy» en la fila del extracto.
 * La propuesta muestra la liquidación, el neto y lo que ELLA documenta como
 * descuento; confirmar llama `esElGiroDeLeasefy` y no emite nada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario, PropuestaDelGiro } from '@/lib/api/conciliacion-bancaria.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { esElGiroDeLeasefy: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { PropuestaDeLaPasarelaGiro } from './PropuestaDeLaPasarelaGiro';

const propuesta: PropuestaDelGiro = {
  tipo: 'liquidacion',
  liquidacionId: 'liq-1',
  numero: 'D77-AB12CD34',
  referenciaDelGiro: 'LEASEFY D77-AB12CD34',
  fechaDelGiro: '2026-10-05',
  brutoCop: 2_400_000,
  netoCop: 2_328_600,
  cantidadDePagos: 2,
  descuentos: [{ concepto: 'Comisión de Wompi', valorCop: 71_400, fuente: 'reporte-de-wompi' }],
  diferenciaCop: 71_400,
  documentadaPorLaFuente: true,
  conLaReferencia: false,
  confianza: 'alta',
  aplicableSola: true,
  porQue: ['La línea dice LEASEFY y el valor es el neto exacto de la liquidación.'],
};
const movimiento = { id: 'mov-1', valorCop: 2_328_600 } as MovimientoBancario;

let root: Root;
let contenedor: HTMLDivElement;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  vi.clearAllMocks();
});
afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('PropuestaDeLaPasarelaGiro', () => {
  it('dice la liquidación, el neto y el descuento que ella documenta', () => {
    act(() => root.render(<PropuestaDeLaPasarelaGiro movimiento={movimiento} propuestas={[propuesta]} puedeEditar ocupado={false} onCambio={() => {}} />));
    const texto = contenedor.textContent ?? '';
    expect(texto).toContain('Liquidación D77-AB12CD34');
    expect(texto).toContain('2.328.600');
    expect(texto).toContain('Comisión de Wompi');
    expect(texto).toContain('lo documenta la liquidación');
    // ARREGLOS-5 (Nico Q3 a): dice qué pasa en libros al conciliarlo.
    expect(contenedor.querySelector('[data-testid="giro-en-libros-mov-1"]')?.textContent).toContain(
      'el neto pasa a la cuenta contable de tu banco',
    );
  });

  it('«Es el giro de Leasefy» confirma contra la liquidación y recarga', async () => {
    api.esElGiroDeLeasefy.mockResolvedValue({ id: 'mov-1', estado: 'IGNORADO' });
    const onCambio = vi.fn();
    act(() => root.render(<PropuestaDeLaPasarelaGiro movimiento={movimiento} propuestas={[propuesta]} puedeEditar ocupado={false} onCambio={onCambio} />));
    const boton = contenedor.querySelector('[data-testid="es-el-giro-de-leasefy-mov-1"]') as HTMLButtonElement;
    await act(async () => {
      boton.click();
    });
    expect(api.esElGiroDeLeasefy).toHaveBeenCalledWith('mov-1', 'liq-1');
    expect(onCambio).toHaveBeenCalled();
    expect(toastMock.success.mock.calls[0][0]).toContain('No se emitió nada');
  });

  it('sin permiso de editar, el botón no se aprieta', () => {
    act(() => root.render(<PropuestaDeLaPasarelaGiro movimiento={movimiento} propuestas={[propuesta]} puedeEditar={false} ocupado={false} onCambio={() => {}} />));
    const boton = contenedor.querySelector('[data-testid="es-el-giro-de-leasefy-mov-1"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });
});
