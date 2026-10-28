/**
 * El atajo de quien sólo quiere publicar (Nico, 27-10-2026: «crear una cuenta no
 * está sencillo para entrar solo al marketplace»).
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { SoloPublicarEnElMarketplace } from './SoloPublicarEnElMarketplace';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

function pintar(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(el);
  });
  return container.querySelector('[data-testid="solo-publicar-en-el-marketplace"]') as HTMLAnchorElement;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('SoloPublicarEnElMarketplace', () => {
  it('lleva al registro corto de /publica y dice que no pide NIT ni propietarios', () => {
    const a = pintar(<SoloPublicarEnElMarketplace />);
    expect(a.getAttribute('href')).toBe('/publica');
    expect(a.textContent).toContain('¿Sólo quieres publicar en el marketplace?');
    expect(a.textContent).toContain('sin NIT ni propietarios');
  });

  it('con el perfil ya elegido no lo vuelve a preguntar', () => {
    const a = pintar(<SoloPublicarEnElMarketplace perfil="agency" />);
    expect(a.getAttribute('href')).toBe('/publica?perfil=agency');
  });
});
