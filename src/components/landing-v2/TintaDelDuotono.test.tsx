/**
 * El duotono que florece (30-10): la capa de tinta va encima de la foto, no se anuncia, no recibe el mouse y se
 * apaga (florece) cuando la foto llega a la pantalla. Con «reducir movimiento», no hay tinta.
 */
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const movimiento = vi.hoisted(() => ({ reducido: false }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => movimiento.reducido }));

import { TintaDelDuotono } from './TintaDelDuotono';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let alVer: ((es: Array<Partial<IntersectionObserverEntry>>) => void) | null = null;
const ioOriginal = globalThis.IntersectionObserver;

afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  alVer = null;
  movimiento.reducido = false;
  globalThis.IntersectionObserver = ioOriginal;
});

function pintar() {
  globalThis.IntersectionObserver = class {
    constructor(cb: (es: Array<Partial<IntersectionObserverEntry>>) => void) {
      alVer = cb;
    }
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<TintaDelDuotono src="/portada.webp" />));
  return host;
}

describe('TintaDelDuotono', () => {
  it('tiñe la foto con el filtro del duotono, sin anunciarse ni tapar el clic', () => {
    const h = pintar();
    const capa = h.querySelector('[data-testid="tinta-del-duotono"]');
    expect(capa?.getAttribute('aria-hidden')).toBe('true');
    expect(capa?.className).toContain('pointer-events-none');
    const img = capa?.querySelector('img');
    const filtro = capa?.querySelector('filter')?.getAttribute('id');
    expect(filtro).toMatch(/^duotono-[a-zA-Z0-9]+$/);
    expect(img?.getAttribute('src')).toBe('/portada.webp');
    expect(img?.getAttribute('style')).toContain(`url(#${filtro})`);
  });

  it('florece al llegar a la pantalla y se vuelve a teñir sólo si sale por abajo', () => {
    const h = pintar();
    const capa = () => h.querySelector('[data-testid="tinta-del-duotono"]')!;
    expect(capa().hasAttribute('data-florecio')).toBe(false);
    act(() => alVer!([{ isIntersecting: true, boundingClientRect: { top: 200 } as DOMRect }]));
    expect(capa().hasAttribute('data-florecio')).toBe(true);
    expect(capa().className).toContain('opacity-0');
    // Sale por arriba (se bajó la página): se queda en color.
    act(() => alVer!([{ isIntersecting: false, boundingClientRect: { top: -400 } as DOMRect }]));
    expect(capa().hasAttribute('data-florecio')).toBe(true);
    // Sale por abajo (se subió la página): vuelve el duotono.
    act(() => alVer!([{ isIntersecting: false, boundingClientRect: { top: 900 } as DOMRect }]));
    expect(capa().hasAttribute('data-florecio')).toBe(false);
  });

  it('con «reducir movimiento» no tiñe: se ve la foto tal cual', () => {
    movimiento.reducido = true;
    const h = pintar();
    expect(h.querySelector('[data-testid="tinta-del-duotono"]')).toBeNull();
  });
});
