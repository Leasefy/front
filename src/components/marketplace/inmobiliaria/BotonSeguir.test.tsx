/**
 * «Seguir» sin sesión (QA del marketplace, 10-10-2026): antes sacaba a la
 * persona a /auth. Ahora abre la ventana de la cuenta encima, recuerda a quién
 * quería seguir y, al volver con sesión, la sigue sola (una sola vez).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { sesion, seguir, laSigo } = vi.hoisted(() => ({
  sesion: { autenticado: false },
  seguir: vi.fn(),
  laSigo: vi.fn(),
}));

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ isAuthenticated: sesion.autenticado }) }));
vi.mock('@/lib/api/marketplace.service', () => ({
  marketplaceApi: { seguir, laSigo, dejarDeSeguir: vi.fn(), siguiendo: vi.fn().mockResolvedValue([]) },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/i/nogal',
  useSearchParams: () => new URLSearchParams(),
}));
// La ventana de la cuenta: basta con ver que se abre y a dónde vuelve.
vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, titulo, returnUrl }: { isOpen: boolean; titulo: string; returnUrl: string }) =>
    isOpen ? (
      <div role="dialog" data-vuelve={returnUrl}>
        {titulo}
      </div>
    ) : null,
}));

import { BotonSeguir } from './piezas';

let raiz: Root;
let caja: HTMLDivElement;

beforeEach(() => {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  sessionStorage.clear();
  seguir.mockReset().mockResolvedValue({ siguiendo: true, seguidores: 11 });
  laSigo.mockReset().mockResolvedValue({ siguiendo: false });
});

afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
});

const nogal = { id: 'ag-nogal', nombre: 'Nogal Inmobiliaria', seguidores: 10 };

describe('<BotonSeguir> sin sesión', () => {
  it('abre la ventana de la cuenta encima, sin navegar, y recuerda a quién seguir', async () => {
    sesion.autenticado = false;
    await act(async () => raiz.render(<BotonSeguir i={nogal} />));
    await act(async () => {
      caja.querySelector<HTMLButtonElement>('[data-testid="boton-seguir"]')!.click();
    });
    const ventana = document.querySelector('[role="dialog"]');
    expect(ventana?.textContent).toBe('Para seguir a Nogal Inmobiliaria necesitas una cuenta');
    expect(ventana?.getAttribute('data-vuelve')).toBe('/i/nogal');
    expect(sessionStorage.getItem('leasefy:seguir-al-entrar')).toBe('ag-nogal');
    expect(seguir).not.toHaveBeenCalled();
  });

  it('al volver con sesión la sigue sola, una vez, y no pregunta si ya la sigue', async () => {
    sesion.autenticado = true;
    sessionStorage.setItem('leasefy:seguir-al-entrar', 'ag-nogal');
    await act(async () => raiz.render(<BotonSeguir i={nogal} />));
    expect(seguir).toHaveBeenCalledTimes(1);
    expect(seguir).toHaveBeenCalledWith('ag-nogal');
    expect(laSigo).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('leasefy:seguir-al-entrar')).toBeNull();
    expect(caja.textContent).toContain('Siguiendo');
  });

  it('lo pendiente de OTRA inmobiliaria no la sigue', async () => {
    sesion.autenticado = true;
    sessionStorage.setItem('leasefy:seguir-al-entrar', 'ag-ceiba');
    await act(async () => raiz.render(<BotonSeguir i={nogal} />));
    expect(seguir).not.toHaveBeenCalled();
    expect(laSigo).toHaveBeenCalledWith('ag-nogal');
    expect(sessionStorage.getItem('leasefy:seguir-al-entrar')).toBe('ag-ceiba');
  });
});
