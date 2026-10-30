/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: Object.assign(() => Promise.resolve(), { reset: () => {} }) }));

import { ChipDelAliado, RegaloDelAliado, SelloDelAliado } from './EscenaDeMarca';

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar(el: React.ReactElement) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(el);
  });
}
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});

describe('El aliado con su logo (Nico, 28-10: «que se vea súper top»)', () => {
  it('el sello pone el logo del aliado junto al de Leasefy', async () => {
    await montar(<SelloDelAliado aliado="La Lonja" />);
    const logo = document.querySelector<HTMLImageElement>('[data-testid="sello-del-aliado"] img');
    expect(logo?.getAttribute('src')).toBe('/aliados/la-lonja.png');
    expect(logo?.getAttribute('alt')).toBe('La Lonja');
    expect(document.querySelector('[aria-label="Leasefy"]')).not.toBeNull();
  });

  it('un aliado sin logo se escribe con su nombre, nunca con una imagen rota', async () => {
    await montar(<SelloDelAliado aliado="Camacol" />);
    expect(document.querySelector('[data-testid="sello-del-aliado"] img')).toBeNull();
    expect(document.body.textContent).toContain('Camacol');
  });

  it('la tarjeta del regalo en publicar: el logo, el regalo y sin tarjeta de crédito', async () => {
    await montar(<RegaloDelAliado aliado="Fianly" />);
    // 28-10: el sello de co-marca dentro de la tarjeta (el logo del aliado | leasefy) y una foto real del banco.
    expect(document.querySelector('[data-testid="regalo-del-aliado"] [data-testid="sello-del-aliado"] img')?.getAttribute('src')).toBe('/aliados/fianly.webp');
    expect(document.querySelector('[data-testid="regalo-del-aliado"] img')?.getAttribute('src')).toMatch(/^\/imagenes\/banco\//);
    expect(document.body.textContent).toContain('Un regalo de Fianly');
    expect(document.body.textContent).toContain('Un mes de Leasefy completo.');
    expect(document.body.textContent).toContain('sin tarjeta');
  });

  it('la pastilla dice de quién es el regalo', async () => {
    await montar(<ChipDelAliado aliado="Fenalco" />);
    expect(document.querySelector('[data-testid="chip-del-aliado"]')?.textContent).toBe('Regalo de Fenalco');
  });
});
