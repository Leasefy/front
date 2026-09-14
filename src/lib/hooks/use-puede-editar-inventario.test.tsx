/**
 * Quién puede cargar el inventario. Una sola regla para las dos pantallas
 * (ficha del inmueble y ficha del contrato) desde que Nico pidió (2026-09-13)
 * poder agregarlo también desde el contrato.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { permisos, sinSenal } = vi.hoisted(() => ({
  permisos: {
    canAccess: vi.fn((_modulo: string, _accion: string) => false),
    isAdmin: false,
    isLoading: false,
  },
  sinSenal: { valor: false },
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisos,
}));

vi.mock('@/lib/hooks/use-sin-senal', () => ({
  useSinSenal: () => sinSenal.valor,
  estaSinSenal: () => sinSenal.valor,
}));

import { usePuedeEditarInventario } from './use-puede-editar-inventario';

let container: HTMLDivElement;
let root: Root;

function puede(): boolean {
  let ultimo = false;
  function Sonda() {
    ultimo = usePuedeEditarInventario();
    return null;
  }
  act(() => {
    root.render(React.createElement(Sonda));
  });
  return ultimo;
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(false);
  permisos.isAdmin = false;
  permisos.isLoading = false;
  sinSenal.valor = false;
});

describe('usePuedeEditarInventario', () => {
  it('con el portafolio a la vista, edita: es el mismo permiso de la ficha del inmueble', () => {
    permisos.canAccess.mockImplementation((m: string, a: string) => m === 'portafolio' && a === 'view');
    expect(puede()).toBe(true);
  });

  it('quien ve contratos pero no el portafolio, mira y no toca', () => {
    permisos.canAccess.mockImplementation((m: string) => m === 'contratos');
    expect(puede()).toBe(false);
  });

  it('el admin de la agencia edita siempre', () => {
    permisos.isAdmin = true;
    expect(puede()).toBe(true);
  });

  it('mientras se averigua, no: un `false` de carga no es un «no»', () => {
    permisos.isLoading = true;
    permisos.canAccess.mockReturnValue(true);
    expect(puede()).toBe(false);
  });

  /*
   * 🔴 El caso para el que se hizo todo esto: la persona está DENTRO del
   * apartamento sin señal. Los permisos no vuelven, `canAccess` da false, y
   * dejarla mirando sería romper lo único que iba a hacer ahí. No se pudo
   * PREGUNTAR no es lo mismo que la respuesta fue NO — mismo criterio que
   * `PageGuard`, y la subida la sigue decidiendo el back.
   */
  it('sin señal no se le quita a nadie lo que estaba haciendo', () => {
    sinSenal.valor = true;
    permisos.canAccess.mockReturnValue(false);
    expect(puede()).toBe(true);
  });
});
