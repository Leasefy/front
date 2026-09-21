/**
 * 🔴 21-09 · El `Combobox` tiene que aceptar `data-testid`.
 *
 * El del DS no lo reenvía a ningún nodo: se lo come. Con 77 usos en el
 * producto, ninguna prueba puede apuntarle a UNO en una pantalla con varios y
 * hay que buscarlo por el texto del placeholder, que cambia con el copy.
 *
 * Lo que esta prueba fija, además del reenvío: que envolver NO cambie el
 * layout (`display: contents`) y que sin `data-testid` no aparezca ninguna
 * envoltura — 77 pantallas no pueden ganar un div porque una prueba lo quiera.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@leasefy/cadence', () => ({
  // El del DS: pinta un botón y NO reenvía nada que no conozca.
  Combobox: ({ placeholder }: { placeholder?: string }) => (
    <button type="button">{placeholder ?? 'elige'}</button>
  ),
}));

import { Combobox } from './combobox';

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
  return host;
}

describe('Combobox', () => {
  it('🔴 reenvía `data-testid`, que el del DS se come', async () => {
    const h = await montar(
      <Combobox
        options={[]}
        value=""
        onChange={() => {}}
        placeholder="Cuenta"
        data-testid="cuenta-del-asiento"
      />,
    );
    const marcado = h.querySelector('[data-testid="cuenta-del-asiento"]');
    expect(marcado).not.toBeNull();
    expect(marcado!.textContent).toContain('Cuenta');
  });

  it('la envoltura no dibuja caja: el layout de quien lo usa no cambia', async () => {
    const h = await montar(
      <Combobox options={[]} value="" onChange={() => {}} data-testid="x" />,
    );
    expect(h.querySelector('[data-testid="x"]')!.className).toContain('contents');
  });

  it('sin `data-testid` no hay envoltura: 77 pantallas no ganan un div', async () => {
    const h = await montar(<Combobox options={[]} value="" onChange={() => {}} />);
    expect(h.querySelector('div')).toBeNull();
    expect(h.querySelector('button')).not.toBeNull();
  });

  it('dos en la misma pantalla se distinguen', async () => {
    const h = await montar(
      <>
        <Combobox options={[]} value="" onChange={() => {}} placeholder="Cuenta" data-testid="cuenta" />
        <Combobox options={[]} value="" onChange={() => {}} placeholder="Tercero" data-testid="tercero" />
      </>,
    );
    expect(h.querySelector('[data-testid="cuenta"]')!.textContent).toContain('Cuenta');
    expect(h.querySelector('[data-testid="tercero"]')!.textContent).toContain('Tercero');
  });
});
