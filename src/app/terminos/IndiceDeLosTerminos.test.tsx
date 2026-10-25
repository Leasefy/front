/**
 * Revisora r25: a 390 los términos miden 15.600 px; el índice se queda pegado
 * arriba, dice cuántas secciones hay y se cierra al saltar a una.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { IndiceDeLosTerminos } from './IndiceDeLosTerminos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('IndiceDeLosTerminos', () => {
  it('queda pegado arriba y se cierra al saltar a una sección', () => {
    act(() =>
      root.render(
        <IndiceDeLosTerminos>
          <section><h2>1. Objeto</h2></section>
          <section><h2>2. Quiénes somos</h2></section>
          <section><h2>3. Pagos</h2></section>
        </IndiceDeLosTerminos>,
      ),
    );
    const nav = host.querySelector('[data-testid="indice-de-los-terminos"]') as HTMLElement;
    expect(nav.className).toContain('sticky');
    expect(host.querySelector('[data-testid="indice-vas-en"]')?.textContent).toContain('3 secciones');
    const boton = nav.querySelector('button') as HTMLButtonElement;
    act(() => boton.click());
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    act(() => (nav.querySelector('a[href="#seccion-3"]') as HTMLAnchorElement).click());
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });
});
