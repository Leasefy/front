import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  avisarFallaDeRed,
  avisarQueLeasefyRespondio,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion';

import { useAlVolverLaConexion } from './al-volver-la-conexion';

/**
 * XE-01: «apenas vuelva la red los traemos» tiene que ser verdad en la lista
 * de Inquilinos — al volver la conexión se pide otra vez, una sola vez, y sólo
 * si la lectura había fallado.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
function montar(volverAPedir: () => void, fallo: boolean) {
  function Prueba() {
    useAlVolverLaConexion(volverAPedir, fallo);
    return null;
  }
  const nodo = document.createElement('div');
  document.body.appendChild(nodo);
  raiz = createRoot(nodo);
  act(() => raiz!.render(<Prueba />));
}

describe('useAlVolverLaConexion', () => {
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    reiniciarEstadoDeConexion();
  });

  it('con la lectura fallida, al volver Leasefy se vuelve a pedir una vez', () => {
    const volverAPedir = vi.fn();
    montar(volverAPedir, true);
    act(() => avisarFallaDeRed());
    expect(volverAPedir).not.toHaveBeenCalled();
    act(() => avisarQueLeasefyRespondio());
    expect(volverAPedir).toHaveBeenCalledTimes(1);
    act(() => avisarQueLeasefyRespondio());
    expect(volverAPedir).toHaveBeenCalledTimes(1);
  });

  it('si la lectura no había fallado, no pide nada de más', () => {
    const volverAPedir = vi.fn();
    montar(volverAPedir, false);
    act(() => avisarFallaDeRed());
    act(() => avisarQueLeasefyRespondio());
    expect(volverAPedir).not.toHaveBeenCalled();
  });
});
