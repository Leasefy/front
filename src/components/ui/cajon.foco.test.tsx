/**
 * QA-PROP-95 G-11 (04-10-2026) · «Nuevo propietario» abre el cajón; Esc lo
 * cierra y el foco tiene que volver a «Nuevo propietario». Caía al principio
 * de la página («Saltar al contenido principal»): `Cajon` se abre por estado,
 * no por un `Trigger` de Radix, y Radix sólo le devuelve el foco a su Trigger.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { Cajon, CajonCabecera, CajonCuerpo } from './cajon';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Pantalla({ abierto }: { abierto: boolean }) {
  return (
    <>
      <button type="button" data-testid="nuevo">Nuevo propietario</button>
      <Cajon abierto={abierto} onOpenChange={() => {}}>
        <CajonCabecera titulo="Nuevo propietario" />
        <CajonCuerpo>
          <input aria-label="Nombre" />
        </CajonCuerpo>
      </Cajon>
    </>
  );
}

describe('el foco al cerrar el cajón', () => {
  it('vuelve al botón que lo abrió', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Pantalla abierto={false} />));
    const nuevo = host.querySelector('[data-testid="nuevo"]') as HTMLButtonElement;
    nuevo.focus();
    expect(document.activeElement).toBe(nuevo);
    await act(async () => root.render(<Pantalla abierto />));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(document.activeElement).not.toBe(nuevo);
    await act(async () => root.render(<Pantalla abierto={false} />));
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
    expect(document.activeElement).toBe(nuevo);
  });
});
