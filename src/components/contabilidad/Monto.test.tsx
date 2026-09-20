/**
 * `Monto` — un monto no se parte nunca.
 *
 * 🔴 20-09 · Esta prueba nace de abrir el libro mayor en 1440 px. Con quince
 * columnas de meses, las celdas apretaron y los montos se partieron en dos
 * renglones: «$» arriba y «2.000» abajo; en un saldo negativo, el «−$» solo
 * arriba y la cifra abajo. `formatCurrency` separa el símbolo de la cifra con
 * un espacio común, y el navegador corta ahí en cuanto falta ancho.
 *
 * El arreglo va en el PRIMITIVO, no en las celdas de cada pantalla, porque
 * `Monto` lo usan quince archivos y el próximo iba a nacer con el mismo
 * defecto. Esta prueba es lo que impide que alguien lo saque «porque estorba».
 */

import { describe, expect, it, afterEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

import { Monto } from './Monto';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

async function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(nodo);
  });
  return host.querySelector('span')!;
}

describe('Monto', () => {
  it('🔴 no se puede partir en dos renglones', async () => {
    const span = await montar(<Monto valor={2000} />);
    expect(span.className).toContain('whitespace-nowrap');
  });

  it('🔴 tampoco el negativo, que es el que peor se lee partido', async () => {
    const span = await montar(<Monto valor={-2000} />);
    expect(span.className).toContain('whitespace-nowrap');
    expect(span.className).toContain('text-danger');
  });

  it('🔴 tampoco el guion de «sin monto»', async () => {
    const span = await montar(<Monto valor={0} vacioSiCero />);
    expect(span.className).toContain('whitespace-nowrap');
    expect(span.textContent).toBe('—');
  });

  it('un className de la pantalla no puede borrar el nowrap', async () => {
    const span = await montar(<Monto valor={1} className="text-caption" />);
    expect(span.className).toContain('whitespace-nowrap');
    expect(span.className).toContain('text-caption');
  });
});
