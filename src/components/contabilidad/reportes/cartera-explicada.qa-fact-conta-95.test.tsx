/**
 * 🔴 CB-K-03 (QA-FACT-CONTA-95 r2, 05-10-2026): la diferencia de la cartera que
 * el back sabe explicar (la causación del cobro y su cuota dicen valores
 * distintos) sale con su etiqueta en palabras, no como «Sin explicar» ni vacía.
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

const TEXTO =
  'La causación (asiento N.º 12) va por $ 8.900.000, el valor del cobro, y la cuota por $ 10.025.850: la cuota trae el IVA ($ 1.691.000) menos las retenciones ($ 565.150) y la causación no. El libro se corrige con un asiento de ajuste por la diferencia.';

const CONCILIACION: CarteraLibroVsCuotas = {
  hasta: '2026-10-05',
  mayorCop: 7_900_000,
  cuotasCop: 9_025_850,
  diferenciaCop: -1_125_850,
  sinExplicarCop: 0,
  contratos: [
    {
      contractId: 'ct-5',
      codigo: '5',
      inquilino: 'Distribuidora El Ejemplo S.A.S.',
      inmueble: null,
      libroCop: 7_900_000,
      cuotasCop: 9_025_850,
      diferenciaCop: -1_125_850,
      motivos: [{ tipo: 'CAUSADO_CON_OTRO_VALOR', mes: '2026-09', texto: TEXTO, valorCop: -1_125_850 }],
    },
  ],
  sinContrato: [],
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('CB-K-03: el motivo explicado de la cartera', () => {
  it('pinta «Causado con otro valor» con el texto del back y dice que toda la diferencia tiene motivo', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<TablaDeCartera conciliacion={CONCILIACION} soloLasQueNoCuadran />));
    const texto = host.textContent ?? '';
    expect(texto).toContain('Causado con otro valor');
    expect(texto).toContain('asiento N.º 12');
    expect(texto).not.toContain('undefined');
    expect(host.querySelector('[data-testid="sin-explicar-de-la-cartera"]')?.textContent).toBe(
      'Toda la diferencia tiene su motivo abajo.',
    );
  });
});
