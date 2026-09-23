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
  compartirGet: (_clave: string, hacer: () => unknown) => hacer(),
  invalidar: () => {},
  recursoDe: (path: string) => path,
  descartarEnVuelo: () => {},
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

import { Recaudo, mesSinMovimiento, porcentajeRecaudado, serieParaLaTabla, sinTasaQueMedir } from './Recaudo';
import type { TasaDeRecaudo } from '@/lib/tasa-de-recaudo';

/** La tasa como la manda el back (`dashboard/tasa-de-recaudo.ts`). */
function tasa(over: Partial<TasaDeRecaudo> = {}): TasaDeRecaudo {
  return {
    base: 'CAUSADO',
    porDefecto: true,
    rotulo: 'Recaudo sobre lo causado',
    definicion: '',
    numeradorCop: 0,
    denominadorCop: 0,
    pct: null,
    ...over,
  };
}

const HOY = mesActual();
const ANTERIOR = sumarMeses(HOY, -1);

function resumen(over: Partial<ResumenDeRecaudo> = {}): ResumenDeRecaudo {
  return {
    month: HOY,
    // 🔴 LA DEUDA sale de las cuotas del contrato, no de los cobros emitidos.
    deudaDelMesCop: 3_000_000,
    cuotasDelMes: 2,
    cuotasPagadas: 1,
    cuotasPendientes: 1,
    cuotasEnCartera: 1,
    cobrosEmitidos: 2,
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
  deudaDelMesCop: 0,
  cuotasDelMes: 0,
  cuotasPagadas: 0,
  cuotasPendientes: 0,
  cuotasEnCartera: 0,
  cobrosEmitidos: 0,
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
    { month: ANTERIOR, deudaDelMesCop: 1, facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0, tasaDeRecaudo: tasa() },
    {
      month: HOY,
      deudaDelMesCop: 3_000_000,
      facturadoCop: 3_000_000,
      recaudadoCop: 1_500_000,
      dispersadoCop: 1_000_000,
      tasaDeRecaudo: tasa({ numeradorCop: 1_500_000, denominadorCop: 3_000_000, pct: 50 }),
    },
  ]);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
});

describe('Recaudo', () => {
  it('muestra las cinco cifras con su definición, los cobros emitidos y el detalle por medio', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();

    // 🔴 «Se debe» es la cifra de referencia y sale de las CUOTAS del contrato.
    expect($('[data-testid="valor-se-debe"]').textContent).toBe('$ 3.000.000');
    expect($('[data-testid="cifra-se-debe"]').textContent).toContain('2 cuotas');
    expect($('[data-testid="valor-llego"]').textContent).toBe('$ 1.500.000');
    expect($('[data-testid="cifra-llego"]').textContent).toContain('$ 1.000.000 son de cobros de este mes');
    expect($('[data-testid="valor-pendiente"]').textContent).toBe('$ 1.500.000');
    // Se cuenta en CUOTAS, no en cobros: con 0 cobros emitidos el rótulo viejo
    // decía «Saldo de los 0 cobros del mes sin pagar» sobre $1.251 millones.
    expect($('[data-testid="cifra-pendiente"]').textContent).toContain('Saldo de 1 cuota');
    expect($('[data-testid="cifra-pendiente"]').textContent).toContain('En cartera acumulada');
    expect($('[data-testid="cifra-pendiente"]').textContent).toContain('$ 800.000');
    expect($('[data-testid="valor-dispersado"]').textContent).toBe('$ 1.000.000');
    expect($('[data-testid="cifra-dispersado"]').textContent).toContain('$ 150.000 de comisión');
    expect($('[data-testid="valor-disponible"]').textContent).toBe('$ 2.850.000');
    expect($('[data-testid="facturado"]').textContent).toContain('Cobros emitidos $ 3.000.000');
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

  it('un mes sin nada lo dice, pero deja las cifras en cero y las tablas de la casa a la vista', async () => {
    resumenMock.mockResolvedValue(VACIO);
    await montar();
    expect(host.querySelector('[data-testid="mes-sin-movimiento"]')).not.toBeNull();
    expect(host.textContent).toContain('Nada que contar en');
    expect(host.querySelector('[data-testid="cifras"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="serie-mensual"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="sin-recibos"]')).not.toBeNull();
    expect(mesSinMovimiento(VACIO)).toBe(true);
    expect(mesSinMovimiento(resumen())).toBe(false);
    // Un mes con cobros pendientes pero sin plata NO es un mes vacío.
    expect(mesSinMovimiento({ ...VACIO, cobrosPendientes: 3, facturadoCop: 1 })).toBe(false);
    // 🔴 Ni un mes que hace deber plata sin un solo cobro emitido.
    expect(mesSinMovimiento({ ...VACIO, deudaDelMesCop: 1_251_000_000, cuotasDelMes: 30_951 })).toBe(false);
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
    // La columna dice con qué fórmula se midió, no «% recaudado».
    expect($('[data-testid="rotulo-de-la-tasa"]').textContent).toBe('Recaudo sobre lo causado');
    expect(filas[1].textContent).toContain('Sin deuda');
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

  it('🔴 un mes con deuda y CERO cobros emitidos no se anuncia como vacío', async () => {
    // Es el mes típico de la inmobiliaria migrada: 30.951 cuotas, 0 cobros.
    // Con las condiciones viejas de `mesSinMovimiento` cumplía las cuatro y
    // salía «Nada que contar» encima de $1.251 millones de deuda viva.
    resumenMock.mockResolvedValue(
      resumen({
        cobrosEmitidos: 0,
        cobrosPagados: 0,
        cobrosPendientes: 0,
        cobrosEnMora: 0,
        facturadoCop: 0,
        recaudadoCop: 0,
        recaudadoDelMesCop: 0,
        dispersadoCop: 0,
        porMedio: [],
      }),
    );
    await montar();

    expect(host.textContent).not.toContain('Nada que contar');
    expect($('[data-testid="valor-se-debe"]').textContent).toBe('$ 3.000.000');
    // Y el cero de los cobros se dice con palabras, no como «Facturado $ 0».
    expect($('[data-testid="facturado"]').textContent).toContain('Nadie emitió un cobro');
  });

  it('si el back falla se ve el fallo, no un mes vacío', async () => {
    resumenMock.mockRejectedValue(new Error('Se cayó la red.'));
    await montar();
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('el recaudo: Se cayó la red.');
    expect(host.textContent).not.toContain('Nada que contar');
  });
});

describe('los helpers de la tabla', () => {
  it('🔴 el porcentaje es la tasa que midió el back: la pantalla no divide la caja entre la deuda', () => {
    // Dividía `recaudadoCop` (la caja del mes, de cualquier período) entre la
    // deuda: una tercera «tasa de recaudo» que no cuadraba con ninguna otra.
    expect(porcentajeRecaudado({ tasaDeRecaudo: tasa() })).toBeNull();
    expect(porcentajeRecaudado({ tasaDeRecaudo: tasa({ pct: 50 }) })).toBe(50);
    expect(porcentajeRecaudado({ tasaDeRecaudo: tasa({ pct: 33.33 }) })).toBe(33);
    // Una respuesta vieja sin la tasa no se inventa un número.
    expect(porcentajeRecaudado({})).toBeNull();
  });

  it('sin contra qué medir dice por qué, según la fórmula de la inmobiliaria', () => {
    expect(sinTasaQueMedir({ tasaDeRecaudo: tasa() })).toBe('Sin deuda');
    expect(
      sinTasaQueMedir({ tasaDeRecaudo: tasa({ base: 'EMITIDO', rotulo: 'Pagado de lo emitido' }) }),
    ).toBe('Sin cobros');
  });

  it('la serie se ordena del mes más reciente al más viejo sin mutar la original', () => {
    const serie = [
      { month: '2026-07', deudaDelMesCop: 1, facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
      { month: '2026-09', deudaDelMesCop: 1, facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
      { month: '2026-08', deudaDelMesCop: 1, facturadoCop: 1, recaudadoCop: 1, dispersadoCop: 0 },
    ];
    expect(serieParaLaTabla(serie).map((p) => p.month)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(serie[0].month).toBe('2026-07');
  });
});

/*
 * 🔴 CADA BLOQUE DICE QUÉ ES (21-09). Nico: «pasa lo mismo con esta de
 * recaudo… es un vómito literal», «todo en esta pantalla está como suelto,
 * nada realmente se sabe que es de qué».
 *
 * Eran cuatro bloques apilados y sólo UNO —el gráfico— llevaba su nombre. «No
 * nombramos las tablas» vale cuando la tarjeta que las contiene ya lo dice; acá
 * la tabla ERA la tarjeta entera, así que nada la nombraba.
 */
describe('cada bloque de Recaudo dice qué es', () => {
  it('las dos tablas llevan título y una línea de qué muestran', async () => {
    resumenMock.mockResolvedValue(resumen());
    await montar();

    const serie = host.querySelector('[data-testid="serie-mensual"]');
    const porMedio = host.querySelector('[data-testid="por-medio"]');
    expect(serie).not.toBeNull();
    expect(porMedio).not.toBeNull();

    // El título de cada una es el `aria-labelledby` de su sección: sin él, un
    // lector de pantalla también lee cuatro bloques sin nombre.
    const seccionDeLaSerie = serie!.closest('section');
    const seccionDeLosMedios = porMedio!.closest('section');
    expect(seccionDeLaSerie?.getAttribute('aria-labelledby')).toBe('serie-mensual-titulo');
    expect(seccionDeLosMedios?.getAttribute('aria-labelledby')).toBe('por-medio-titulo');

    expect(seccionDeLaSerie?.textContent).toContain('Mes por mes, en números');
    expect(seccionDeLosMedios?.textContent).toContain('Cómo entró la plata');
    // Y dice que su total es el mismo «Llegó» de arriba: sin eso son dos
    // cifras iguales en dos lugares sin relación declarada.
    expect(seccionDeLosMedios?.textContent).toContain('la misma cifra que «Llegó»');
  });
});
