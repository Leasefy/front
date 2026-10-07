/**
 * CB-39 (QA-CONTA-PROF, 04-10-2026): la conciliación de la cartera pinta las
 * tres cifras, cuánto queda sin explicar, cada contrato con su motivo y lo que
 * no lleva a ningún contrato. Nunca un porqué inventado: lo dice el back.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CarteraLibroVsCuotas } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

import { TablaDeCartera } from './CarteraLibroVsCuotas';

const CONCILIACION: CarteraLibroVsCuotas = {
  hasta: '2026-10-04',
  mayorCop: 331_478_320.84,
  cuotasCop: 242_811_550,
  diferenciaCop: 88_666_770.84,
  sinExplicarCop: 380_850,
  contratos: [
    {
      contractId: 'ct-17',
      codigo: '17',
      inquilino: 'Paula Restrepo',
      inmueble: 'Calle 10 # 40-50',
      libroCop: 7_600_000,
      cuotasCop: 7_219_150,
      diferenciaCop: 380_850,
      motivos: [
        { tipo: 'SIN_EXPLICAR', mes: '2026-09', texto: 'El libro y la cuota tienen valores distintos y no se sabe por qué.', valorCop: 380_850 },
      ],
    },
    {
      contractId: 'ct-9',
      codigo: '9',
      inquilino: 'Mateo Ríos',
      inmueble: null,
      libroCop: 0,
      cuotasCop: 1_000_000,
      diferenciaCop: -1_000_000,
      motivos: [
        { tipo: 'SIN_CAUSAR', mes: '2026-10', texto: 'La cuota se debe y no tiene cobro: no se ha causado en el libro.', valorCop: -1_000_000 },
      ],
    },
    { contractId: 'ct-2', codigo: '2', inquilino: 'Ana', inmueble: null, libroCop: 0, cuotasCop: 0, diferenciaCop: 0, motivos: [] },
  ],
  sinContrato: [
    { tipo: 'COBRO_QUE_YA_NO_EXISTE', texto: 'Causaciones, recibos o reversas de cobros que ya no existen (se borraron sin reversar su asiento).', valorCop: 142_950_000, documentos: 59, explicado: true },
  ],
};

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;
function montar(soloLasQueNoCuadran = true) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root!.render(<TablaDeCartera conciliacion={CONCILIACION} soloLasQueNoCuadran={soloLasQueNoCuadran} />);
  });
  return contenedor;
}
afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

describe('la conciliación de la cartera (CB-39)', () => {
  it('dice las tres cifras y cuánto queda sin explicar', () => {
    const c = montar();
    expect(c.querySelector('[data-testid="veredicto-de-la-cartera"]')?.textContent).toContain('$331478320.84');
    expect(c.querySelector('[data-testid="sin-explicar-de-la-cartera"]')?.textContent).toContain('$380850');
    expect(c.querySelector('[data-testid="cifras-de-la-cartera"]')?.textContent).toContain('$242811550');
  });

  it('cada contrato que no cuadra con su motivo; el que cuadra no sale (con el filtro)', () => {
    const c = montar();
    const filas = c.querySelectorAll('[data-testid="fila-de-cartera"]');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Contrato #17 · Paula Restrepo');
    expect(filas[0].textContent).toContain('Sin explicar · septiembre de 2026');
    expect(filas[1].textContent).toContain('Sin causar · octubre de 2026');
    expect(c.textContent).not.toContain('Ana');
  });

  it('sin el filtro sale también el que cuadra, y dice «Cuadra»', () => {
    const c = montar(false);
    expect(c.querySelectorAll('[data-testid="fila-de-cartera"]')).toHaveLength(3);
    expect(c.textContent).toContain('Cuadra');
  });

  it('lo que no lleva a ningún contrato va aparte, con su porqué y cuántos documentos', () => {
    const c = montar();
    const aparte = c.querySelector('[data-testid="cartera-sin-contrato"]')?.textContent ?? '';
    expect(aparte).toContain('cobros que ya no existen');
    expect(aparte).toContain('59 documentos');
    expect(aparte).toContain('$142950000');
  });
});
