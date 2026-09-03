/**
 * La vista de recaudo: las cuatro cifras con su definición, el vacío honesto,
 * el selector que no pasa del mes actual y pide el mes correcto, y el fallo
 * que no se disfraza de vacío.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { mesActual, sumarMeses } from '@/lib/recaudo/meses';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resumenMock = vi.fn();
const serieMock = vi.fn();

vi.mock('@/lib/api/recaudo.service', () => ({
  recaudoApi: {
    resumen: (...args: unknown[]) => resumenMock(...args),
    serie: (...args: unknown[]) => serieMock(...args),
  },
}));

vi.mock('@/lib/api/refresco-de-datos', () => ({
  alCambiar: () => () => {},
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('./GraficoDeRecaudo', () => ({
  GraficoDeRecaudo: ({ serie }: { serie: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'grafico-de-recaudo', 'data-puntos': serie.length }),
}));

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga' },
      `${queEs}: ${error instanceof Error ? error.message : String(error)}`,
    ),
}));

import { Recaudo, mesSinMovimiento, porcentajeRecaudado, serieParaLaTabla } from './Recaudo';

const HOY = mesActual();
const ANTERIOR = sumarMeses(HOY, -1);

function resumen(over: Partial<ResumenDeRecaudo> = {}): ResumenDeRecaudo {
  return {
    month: HOY,
    facturadoCop: 3_000_000,
    recaudadoCop: 1_500_000,
    recaudadoDelMesCop: 1_000_000,
    pendienteCop: 1_500_000,
    enMoraCop: 800_000,
    dispersadoCop: 1_000_000,
    comisionesCop: 150_000,
    disponibleCop: 2_850_000,
    porMedio: [
      { medio: 'TRANSFERENCIA', valorCop: 1_000_000, cantidad: 1 },
      { medio: 'EFECTIVO', valorCop: 500_000, cantidad: 1 },
    ],
    cobrosPagados: 1,
    cobrosPendientes: 1,
    cobrosEnMora: 0,
    ...over,
  };
}

const VACIO = resumen({
  facturadoCop: 0,
  recaudadoCop: 0,
  recaudadoDelMesCop: 0,
  pendienteCop: 0,
  enMoraCop: 0,
  dispersadoCop: 0,
  comisionesCop: 0,
  disponibleCop: 0,
  porMedio: [],
  cobrosPagados: 0,
  cobrosPendientes: 0,
  cobrosEnMora: 0,
});

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<Recaudo />);
  });
  await esperar();
}

function $(sel: string): HTMLElement {
  const el = host.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`No está: ${sel}`);
  return el;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
}

beforeEach(() => {
  resumenMock.mockReset();
  serieMock.mockReset();
  serieMock.mockResolvedValue([
    { month: ANTERIOR, facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
    { month: HOY, facturadoCop: 3_000_000, recaudadoCop: 1_500_000, dispersadoCop: 1_000_000 },
  ]);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
});

describe('Recaudo', () => {
  it('muestra las cuatro cifras con su definición, lo facturado y el detalle por medio', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();

    expect($('[data-testid="valor-llego"]').textContent).toBe('$ 1.500.000');
    expect($('[data-testid="cifra-llego"]').textContent).toContain('$ 1.000.000 son de cobros de este mes');
    expect($('[data-testid="valor-pendiente"]').textContent).toBe('$ 1.500.000');
    expect($('[data-testid="cifra-pendiente"]').textContent).toContain('En mora acumulada');
    expect($('[data-testid="cifra-pendiente"]').textContent).toContain('$ 800.000');
    expect($('[data-testid="valor-dispersado"]').textContent).toBe('$ 1.000.000');
    expect($('[data-testid="cifra-dispersado"]').textContent).toContain('$ 150.000 de comisión');
    expect($('[data-testid="valor-disponible"]').textContent).toBe('$ 2.850.000');
    expect($('[data-testid="facturado"]').textContent).toContain('Facturado $ 3.000.000');
    expect($('[data-testid="facturado"]').textContent).toContain('1 pagados');

    const porMedio = $('[data-testid="por-medio"]').textContent ?? '';
    expect(porMedio).toContain('Transferencia');
    expect(porMedio).toContain('Efectivo');
    expect(porMedio).toContain('$ 500.000');

    expect($('[data-testid="grafico-de-recaudo"]').getAttribute('data-puntos')).toBe('2');
    expect(resumenMock).toHaveBeenCalledWith(HOY);
    expect(serieMock).toHaveBeenCalledWith(12, HOY);
  });

  it('un disponible negativo se muestra en rojo y dice por qué', async () => {
    resumenMock.mockResolvedValue(resumen({ disponibleCop: -200_000 }));
    await montar();
    expect($('[data-testid="valor-disponible"]').textContent).toBe('$ -200.000');
    expect($('[data-testid="valor-disponible"]').className).toContain('text-danger');
    expect($('[data-testid="cifra-disponible"]').textContent).toContain('nunca pasó por un recibo');
  });

  it('un mes sin nada es un vacío honesto, no cuatro ceros', async () => {
    resumenMock.mockResolvedValue(VACIO);
    await montar();
    expect(host.querySelector('[data-testid="cifras"]')).toBeNull();
    expect(host.textContent).toContain('Nada que contar en');
    expect(mesSinMovimiento(VACIO)).toBe(true);
    expect(mesSinMovimiento(resumen())).toBe(false);
    // Un mes con cobros pendientes pero sin plata NO es un mes vacío.
    expect(mesSinMovimiento({ ...VACIO, cobrosPendientes: 3, facturadoCop: 1 })).toBe(false);
  });

  it('el selector arranca en el mes de hoy, no deja avanzar al futuro y pide el mes anterior', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();

    const [anterior, siguiente] = Array.from(
      $('[data-testid="selector-de-mes"]').querySelectorAll('button'),
    );
    expect(siguiente.disabled).toBe(true);
    expect(resumenMock).toHaveBeenLastCalledWith(HOY);

    resumenMock.mockResolvedValue(resumen({ month: ANTERIOR }));
    await clic(anterior);

    expect(resumenMock).toHaveBeenLastCalledWith(ANTERIOR);
    expect(serieMock).toHaveBeenLastCalledWith(12, ANTERIOR);
    expect(siguiente.disabled).toBe(false);

    await clic(siguiente);
    expect(resumenMock).toHaveBeenLastCalledWith(HOY);
  });

  it('los doce meses van en la tabla de la casa, el más reciente arriba, y tocar una fila cambia el mes', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();

    const filas = Array.from(host.querySelectorAll<HTMLElement>('[data-testid="serie-fila"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].getAttribute('data-mes')).toBe(HOY);
    expect(filas[0].getAttribute('aria-current')).toBe('true');
    expect(filas[0].textContent).toContain('$ 3.000.000');
    expect(filas[0].textContent).toContain('50 %');
    // Un mes sin facturar no tiene porcentaje: «0 %» diría que no se cobró.
    expect(filas[1].getAttribute('aria-current')).toBeNull();

    resumenMock.mockResolvedValue(resumen({ month: ANTERIOR }));
    await clic(filas[1]);
    expect(resumenMock).toHaveBeenLastCalledWith(ANTERIOR);
    expect($('[data-testid="mes-en-foco"]').textContent?.toLowerCase()).toContain(ANTERIOR.slice(0, 4));
  });

  it('por medio de pago: una fila por medio y un pie que suma lo que llegó', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();
    expect(host.querySelectorAll('[data-testid="medio-fila"]')).toHaveLength(2);
    const total = $('[data-testid="medio-total"]').textContent ?? '';
    expect(total).toContain('2');
    expect(total).toContain('$ 1.500.000');
  });

  it('un mes con cobros pero sin recibos dice que no hay recibos, dentro de la tabla', async () => {
    resumenMock.mockResolvedValue(resumen({ porMedio: [], recaudadoCop: 0, recaudadoDelMesCop: 0 }));
    await montar();
    expect(host.querySelector('[data-testid="cifras"]')).not.toBeNull();
    expect($('[data-testid="sin-recibos"]').textContent).toContain('Ningún recibo de caja');
    expect(host.querySelector('[data-testid="medio-total"]')).toBeNull();
  });

  it('si el back falla se ve el fallo, no un mes vacío', async () => {
    resumenMock.mockRejectedValue(new Error('Se cayó la red.'));
    await montar();
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('el recaudo: Se cayó la red.');
    expect(host.textContent).not.toContain('Nada que contar');
  });
});

describe('los helpers de la tabla', () => {
  it('el porcentaje recaudado es null sin facturación, entero con ella', () => {
    expect(porcentajeRecaudado({ facturadoCop: 0, recaudadoCop: 0 })).toBeNull();
    expect(porcentajeRecaudado({ facturadoCop: 3_000_000, recaudadoCop: 1_500_000 })).toBe(50);
    expect(porcentajeRecaudado({ facturadoCop: 3, recaudadoCop: 1 })).toBe(33);
  });

  it('la serie se ordena del mes más reciente al más viejo sin mutar la original', () => {
    const serie = [
      { month: '2026-07', facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
      { month: '2026-09', facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
      { month: '2026-08', facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
    ];
    expect(serieParaLaTabla(serie).map((p) => p.month)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(serie[0].month).toBe('2026-07');
  });
});
