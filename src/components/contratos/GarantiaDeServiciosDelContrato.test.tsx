/**
 * D10 · La garantía de servicios públicos del contrato (Nico, 17-09).
 *
 * Lo que no puede fallar: que se registre un valor sin soporte, que el
 * promedio que se ve no sea el que se guarda, y que la garantía pendiente
 * antes de recibir el inmueble pase desapercibida.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    garantiaDeServicios: vi.fn(),
    registrarGarantia: vi.fn(),
    movimientoDeGarantia: vi.fn(),
    anularMovimientoDeGarantia: vi.fn(),
    soporteDeLaGarantia: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { cicloDeVidaApi, type GarantiaDeServicios } from '@/lib/api/ciclo-de-vida.service';
import { GarantiaDeServiciosDelContrato, promedioMensual } from './GarantiaDeServiciosDelContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function datos(overrides: Partial<GarantiaDeServicios> = {}): GarantiaDeServicios {
  return {
    contractId: 'c1',
    disponible: true,
    momento: 'ENTREGA',
    topeCop: null,
    topePeriodos: 2,
    mesesDelPromedio: 6,
    valorSugeridoCop: null,
    topeEfectivoCop: null,
    avisoDelTope: 'Sin tope configurado: … un abogado debe validar el tope legal.',
    garantia: null,
    cuenta: null,
    movimientos: [],
    pendiente: null,
    ...overrides,
  };
}

function conGarantia(overrides: Partial<GarantiaDeServicios> = {}): GarantiaDeServicios {
  return datos({
    garantia: {
      momento: 'ENTREGA',
      valorCop: 300_000,
      facturas: [{ servicio: 'Energía', periodo: '2026-07', valorCop: 300_000 }],
      soporteNombre: 'facturas.pdf',
      nota: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    cuenta: {
      valorCop: 300_000,
      recaudadoCop: 300_000,
      pagadoCop: 0,
      devueltoCop: 0,
      cobradoCop: 0,
      saldoCop: 300_000,
      faltaPorRecaudarCop: 0,
      diferenciaPorCobrarCop: 0,
      estado: 'RECAUDADA',
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root!.render(<GarantiaDeServiciosDelContrato contractId="c1" puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function escribirFactura(i: number, servicio: string, periodo: string, valor: string) {
  await escribir($(`factura-servicio-${i}`) as HTMLInputElement, servicio);
  await escribir($(`factura-periodo-${i}`) as HTMLInputElement, periodo);
  await escribir($(`factura-valor-${i}`) as HTMLInputElement, valor);
}

describe('promedioMensual (la misma cuenta del back)', () => {
  it('suma las facturas del mismo mes y promedia los meses', () => {
    expect(
      promedioMensual([
        { servicio: 'Agua', periodo: '2026-07', valorCop: 100_000 },
        { servicio: 'Energía', periodo: '2026-07', valorCop: 200_000 },
        { servicio: 'Agua', periodo: '2026-08', valorCop: 100_000 },
      ]),
    ).toBe(200_000);
  });

  it('sin facturas válidas no inventa un promedio', () => {
    expect(promedioMensual([{ servicio: 'Agua', periodo: 'julio', valorCop: 100_000 }])).toBeNull();
  });
});

describe('<GarantiaDeServiciosDelContrato> (D10)', () => {
  it('la inmobiliaria que no la usa no ve la sección', async () => {
    api.garantiaDeServicios.mockResolvedValue(datos({ momento: null, avisoDelTope: null }));
    await montar();
    expect($('garantia-de-servicios')).toBeNull();
  });

  it('🔴 sin tope avisa que un abogado debe validarlo', async () => {
    api.garantiaDeServicios.mockResolvedValue(datos());
    await montar();
    expect($('garantia-aviso-del-tope')!.textContent).toContain('abogado');
    expect(container!.textContent).toContain('antes de recibir el inmueble');
  });

  it('🔴 el promedio que se ve es el que se guarda, y sin soporte no se guarda nada', async () => {
    api.garantiaDeServicios.mockResolvedValue(datos());
    api.registrarGarantia.mockResolvedValue(conGarantia());
    await montar();

    await escribir($('factura-servicio-0') as HTMLInputElement, 'Energía');
    await escribir($('factura-periodo-0') as HTMLInputElement, '2026-07');
    await escribir($('factura-valor-0') as HTMLInputElement, '300.000');
    expect($('garantia-valor-calculado')!.textContent).toContain('300.000');
    // Sin soporte el botón está muerto: el valor siempre va con su respaldo.
    expect(($('guardar-garantia') as HTMLButtonElement).disabled).toBe(true);
  });

  it('🔴 con tope, un valor que se pasa no se puede registrar', async () => {
    api.garantiaDeServicios.mockResolvedValue(datos({ topeCop: 200_000, avisoDelTope: null }));
    await montar();
    await act(async () => ($('forma-promedio') as HTMLInputElement).click());
    await escribir($('garantia-promedio') as HTMLInputElement, '500.000');
    expect($('garantia-sobre-el-tope')).not.toBeNull();
    expect(($('guardar-garantia') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con la garantía registrada muestra la cuenta y el saldo del inquilino', async () => {
    api.garantiaDeServicios.mockResolvedValue(conGarantia());
    await montar();
    expect($('garantia-estado')!.textContent).toBe('Recaudada');
    expect($('garantia-saldo')!.textContent).toContain('300.000');
  });

  it('🔴 lo que falta antes de recibir el inmueble se ve en rojo', async () => {
    api.garantiaDeServicios.mockResolvedValue(
      datos({ pendiente: 'Falta la garantía de servicios públicos: regístrala antes de recibir el inmueble.' }),
    );
    await montar();
    expect($('garantia-pendiente')!.textContent).toContain('antes de recibir el inmueble');
  });

  it('un movimiento no pasa del tope de su tipo, y el pago de un servicio exige la factura', async () => {
    api.garantiaDeServicios.mockResolvedValue(conGarantia());
    await montar();
    const tipo = $('movimiento-tipo') as HTMLSelectElement;
    // Ya está recaudada: el primer tipo que ofrece es el pago de un servicio.
    expect(tipo.value).toBe('PAGO_DE_SERVICIO');
    await escribir($('movimiento-valor') as HTMLInputElement, '120.000');
    await escribir($('movimiento-descripcion') as HTMLInputElement, 'EPM julio');
    expect(($('guardar-movimiento') as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      tipo.value = 'DEVOLUCION';
      tipo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect($('movimiento-tope')!.textContent).toContain('300.000');
    expect(($('guardar-movimiento') as HTMLButtonElement).disabled).toBe(false);
  });

  it('la diferencia por cobrar se dice y se cobra como concepto', async () => {
    api.garantiaDeServicios.mockResolvedValue(
      conGarantia({
        cuenta: {
          valorCop: 300_000,
          recaudadoCop: 300_000,
          pagadoCop: 400_000,
          devueltoCop: 0,
          cobradoCop: 0,
          saldoCop: 0,
          faltaPorRecaudarCop: 0,
          diferenciaPorCobrarCop: 100_000,
          estado: 'CON_DIFERENCIA_POR_COBRAR',
        },
      }),
    );
    await montar();
    expect($('garantia-diferencia')!.textContent).toContain('100.000');
  });

  it('sin permiso de editar se lee la cuenta pero no se registra nada', async () => {
    api.garantiaDeServicios.mockResolvedValue(conGarantia());
    await montar(false);
    expect($('garantia-cuenta')).not.toBeNull();
    expect($('nuevo-movimiento-de-garantia')).toBeNull();
  });

  it('🔴 el promedio son los ÚLTIMOS 6 MESES, no todos los digitados (17-09)', () => {
    const viejas = Array.from({ length: 6 }, (_, k) => ({
      servicio: 'Energía',
      periodo: `2026-0${k + 1}`,
      valorCop: 100_000,
    }));
    const nuevas = Array.from({ length: 6 }, (_, k) => ({
      servicio: 'Energía',
      periodo: `2026-${String(k + 7).padStart(2, '0')}`,
      valorCop: 300_000,
    }));
    // Promediando los doce daría 200.000: la tarifa de hace un año arrastraba.
    expect(promedioMensual([...viejas, ...nuevas], 6)).toBe(300_000);
    // Con menos de seis, se promedian los que haya.
    expect(promedioMensual(nuevas.slice(0, 2), 6)).toBe(300_000);
    // Y el orden en que se digitan no cambia nada.
    expect(promedioMensual([...nuevas].reverse(), 6)).toBe(
      promedioMensual(nuevas, 6),
    );
  });

  it('🔴 el tope son 2 períodos de facturación: lo dice y frena el registro', async () => {
    api.garantiaDeServicios.mockResolvedValue(
      datos({ topeCop: null, topePeriodos: 2, mesesDelPromedio: 6 }),
    );
    await montar();

    // Dos meses de $200.000: sugerido 200.000, tope 400.000.
    await escribirFactura(0, 'Energía', '2026-08', '200000');
    await act(async () => ($('agregar-factura') as HTMLElement).click());
    await escribirFactura(1, 'Energía', '2026-09', '200000');

    expect($('garantia-sugerido')!.textContent).toContain('últimos 6 meses');
    expect($('garantia-tope')!.textContent).toContain('2 períodos de facturación');
    expect($('garantia-sobre-el-tope')).toBeNull();
  });
});
