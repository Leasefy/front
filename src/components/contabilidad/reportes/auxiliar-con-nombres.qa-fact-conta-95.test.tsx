/**
 * QA-FACT-CONTA-95 r2 · CB-C-04: la columna «Tercero» del libro auxiliar dice
 * el nombre y el documento; sin nombre dice «… sin identificar», nunca el id.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { TerceroDelAuxiliar } from './LibroAuxiliar';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
});
function pintar(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(el);
  });
  return container;
}

describe('CB-C-04 · el tercero del auxiliar', () => {
  it('con nombre: el nombre y el documento, y el tipo en el título', () => {
    const c = pintar(<TerceroDelAuxiliar r={{ terceroTipo: 'PROPIETARIO', terceroNombre: 'Paula Propietaria Ruiz', terceroDocumento: '52123456' }} />)
    const el = c.querySelector('[data-testid="auxiliar-tercero"]')!;
    expect(el.textContent).toBe('Paula Propietaria Ruiz · 52123456');
    expect(el.getAttribute('title')).toBe('Propietario · Paula Propietaria Ruiz (52123456)');
  });

  it('sin nombre: dice que no se pudo identificar, sin uuid', () => {
    const c = pintar(<TerceroDelAuxiliar r={{ terceroTipo: 'PROPIETARIO', terceroNombre: null, terceroDocumento: null }} />)
    const el = c.querySelector('[data-testid="auxiliar-tercero"]')!;
    expect(el.textContent).toBe('Propietario sin identificar');
    expect(el.outerHTML).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });
});
