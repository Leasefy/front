/**
 * La corriente de voltaje (Cadence 2 · PIX, 23-10): es decoración. Sin WebGL (como en happy-dom) no pinta nada y
 * no rompe la página; siempre va escondida del lector de pantalla.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CorrienteDeVoltaje } from './CorrienteDeVoltaje';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  host = null;
  root = null;
});

describe('CorrienteDeVoltaje', () => {
  it('es un canvas decorativo que no se anuncia y no rompe sin WebGL', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<CorrienteDeVoltaje className="absolute" />));
    const cv = host.querySelector('[data-testid="corriente-de-voltaje"]');
    expect(cv?.tagName).toBe('CANVAS');
    expect(cv?.getAttribute('aria-hidden')).toBe('true');
    expect(cv?.className).toContain('pointer-events-none');
  });
});
