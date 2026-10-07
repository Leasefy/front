/**
 * use-aviso-al-salir.test.tsx — cerrar la pestaña a mitad de una migración.
 *
 * T-0125. Los importadores corren su bucle EN EL NAVEGADOR: cerrar la pestaña
 * o recargar a mitad corta la carga. Lo escrito queda a salvo en el back, pero
 * un cierre por accidente cuesta una carga cortada, así que mientras haya
 * trabajo en vuelo (o un archivo leído sin aplicar) se registra el aviso
 * nativo del navegador. Quieto, no se registra: un aviso que salta siempre
 * se aprende a ignorar.
 */

import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { useAvisoAlSalir } from './use-aviso-al-salir';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Sonda({ activo }: { activo: boolean }) {
  useAvisoAlSalir(activo);
  return null;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function pintar(activo: boolean) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<Sonda activo={activo} />);
  });
}

async function cambiar(activo: boolean) {
  await act(async () => {
    root!.render(<Sonda activo={activo} />);
  });
}

/** Lanza un `beforeunload` cancelable y dice si alguien pidió el aviso. */
function intentarSalir(): boolean {
  const evento = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evento);
  return evento.defaultPrevented;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe('useAvisoAlSalir', () => {
  it('🔴 con trabajo en vuelo, salir pide confirmación', async () => {
    await pintar(true);
    expect(intentarSalir()).toBe(true);
  });

  it('🔴 quieto no se registra: cerrar la pestaña no molesta', async () => {
    await pintar(false);
    expect(intentarSalir()).toBe(false);
  });

  it('se registra al empezar y se quita al terminar', async () => {
    await pintar(false);
    await cambiar(true);
    expect(intentarSalir()).toBe(true);
    await cambiar(false);
    expect(intentarSalir()).toBe(false);
  });

  it('al desmontar se quita: no queda un aviso huérfano en otra pantalla', async () => {
    await pintar(true);
    await act(async () => {
      root!.unmount();
    });
    root = null;
    expect(intentarSalir()).toBe(false);
  });

  it('pone returnValue, que es lo que Chrome exige para mostrar el aviso', async () => {
    await pintar(true);
    const evento = new Event('beforeunload', { cancelable: true }) as Event & { returnValue?: unknown };
    window.dispatchEvent(evento);
    expect(evento.returnValue).toBe('');
  });

  it('dos pantallas a la vez no se pisan: soltar una deja la otra vigilando', async () => {
    const otro = document.createElement('div');
    document.body.appendChild(otro);
    let rootOtro: Root;
    await act(async () => {
      rootOtro = createRoot(otro);
      rootOtro.render(<Sonda activo />);
    });
    await pintar(true);

    await cambiar(false);
    expect(intentarSalir()).toBe(true);

    await act(async () => {
      rootOtro.unmount();
    });
    otro.remove();
    expect(intentarSalir()).toBe(false);
  });
});
