/**
 * «Publicar» al pie del marketplace (Nico, 09-10-2026): uno o muchos, siempre
 * con cuenta, y nunca un botón que termine en un rebote sin explicación.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { sesion } = vi.hoisted(() => ({ sesion: { actual: {} as Record<string, unknown> } }));

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => sesion.actual }));
// La ventana de la cuenta: sólo importa si se abre, con qué aviso y a dónde sigue.
vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, aviso, returnUrl }: { isOpen: boolean; aviso?: React.ReactNode; returnUrl?: string }) =>
    isOpen ? (
      <div data-testid="ventana-de-la-cuenta" data-destino={returnUrl}>
        {aviso}
      </div>
    ) : null,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import { BotonPublicar, PublicarDesdeElMarketplace } from './PublicarDesdeElMarketplace';

let container: HTMLDivElement;
let root: Root;

function montar(auth: Record<string, unknown>) {
  sesion.actual = { isLoading: false, hasActiveAgencyMembership: false, agencyRole: null, ...auth };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PublicarDesdeElMarketplace />));
}

const enlace = (id: string) => container.querySelector<HTMLAnchorElement>(`[data-testid="${id}"]`);

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('<PublicarDesdeElMarketplace>', () => {
  it('sin sesión: publicar, crear la página o entrar a la que ya tiene', () => {
    montar({ isAuthenticated: false, user: null });
    expect(enlace('publicar-mi-inmueble')!.getAttribute('href')).toBe('/publicar');
    expect(enlace('crear-mi-pagina')!.getAttribute('href')).toBe('/auth?mode=register&role=agency');
    expect(enlace('ya-tengo-cuenta')!.getAttribute('href')).toBe(
      `/auth?returnUrl=${encodeURIComponent('/panel/inmobiliaria/inmuebles/nuevo')}`,
    );
    expect(container.textContent).toContain('Se publica con tu cuenta');
  });

  it('propietario: su asistente de /publicar', () => {
    montar({ isAuthenticated: true, user: { role: 'landlord' } });
    expect(enlace('publicar-mi-inmueble')!.getAttribute('href')).toBe('/publicar');
    expect(enlace('ya-tengo-cuenta')).toBeNull();
    expect(enlace('publicar-uno')).toBeNull();
  });

  it('inmobiliaria: uno por uno, muchos desde un archivo y su página', () => {
    montar({ isAuthenticated: true, user: { role: 'agency' }, hasActiveAgencyMembership: true, agencyRole: 'ADMIN' });
    expect(enlace('publicar-uno')!.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/nuevo');
    expect(enlace('cargar-muchos')!.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/importar');
    expect(enlace('mi-pagina')!.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/tu-pagina');
    // No se le ofrece el asistente del propietario ni crear otra página.
    expect(enlace('publicar-mi-inmueble')).toBeNull();
    expect(enlace('crear-mi-pagina')).toBeNull();
  });

  it('el contador de la inmobiliaria no publica: se le dice, sin botones', () => {
    montar({ isAuthenticated: true, user: { role: 'agency' }, hasActiveAgencyMembership: true, agencyRole: 'CONTADOR' });
    expect(enlace('publicar-uno')).toBeNull();
    expect(container.querySelector('[data-testid="publicar-sin-permiso"]')).not.toBeNull();
  });

  it('inquilino: se le explica por qué no, en vez de mandarlo a un rebote', () => {
    montar({ isAuthenticated: true, user: { role: 'tenant' } });
    expect(enlace('publicar-mi-inmueble')).toBeNull();
    expect(container.querySelector('[data-testid="publicar-cuenta-de-inquilino"]')!.textContent).toContain(
      'Tu cuenta es de inquilino',
    );
  });
});

describe('<BotonPublicar> (siempre a la vista en la barra y el lado)', () => {
  function pintar(auth: Record<string, unknown>) {
    sesion.actual = { isLoading: false, hasActiveAgencyMembership: false, agencyRole: null, ...auth };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<BotonPublicar />));
    return container.querySelector<HTMLAnchorElement>('[data-testid="boton-publicar"]');
  }

  it('sin sesión y el propietario van al asistente de /publicar', () => {
    expect(pintar({ isAuthenticated: false, user: null })!.getAttribute('href')).toBe('/publicar');
    act(() => root.unmount());
    container.remove();
    expect(pintar({ isAuthenticated: true, user: { role: 'landlord' } })!.getAttribute('href')).toBe('/publicar');
  });

  it('la inmobiliaria va a «Nueva consignación» de su panel', () => {
    const b = pintar({ isAuthenticated: true, user: { role: 'agency' }, hasActiveAgencyMembership: true, agencyRole: 'ADMIN' });
    expect(b!.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/nuevo');
  });

  it('el inquilino y el contador no lo ven', () => {
    expect(pintar({ isAuthenticated: true, user: { role: 'tenant' } })).toBeNull();
    act(() => root.unmount());
    container.remove();
    expect(pintar({ isAuthenticated: true, user: { role: 'agency' }, hasActiveAgencyMembership: true, agencyRole: 'CONTADOR' })).toBeNull();
  });
});

describe('sin sesión, «Publicar inmueble» abre la cuenta ENCIMA (Nico, 09-10)', () => {
  it('no navega: abre la ventana con el porqué, y al entrar sigue a publicar', () => {
    sesion.actual = { isLoading: false, hasActiveAgencyMembership: false, agencyRole: null, isAuthenticated: false, user: null };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<BotonPublicar />));
    const boton = container.querySelector<HTMLAnchorElement>('[data-testid="boton-publicar"]')!;
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      boton.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
    const ventana = container.querySelector('[data-testid="ventana-de-la-cuenta"]')!;
    expect(ventana.getAttribute('data-destino')).toBe('/publicar');
    expect(ventana.textContent).toContain('Para publicar tu inmueble necesitas una cuenta');
  });

  it('con sesión, el enlace navega como siempre', () => {
    sesion.actual = { isLoading: false, hasActiveAgencyMembership: false, agencyRole: null, isAuthenticated: true, user: { role: 'landlord' } };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<BotonPublicar />));
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      container.querySelector('[data-testid="boton-publicar"]')!.dispatchEvent(evento);
    });
    expect(container.querySelector('[data-testid="ventana-de-la-cuenta"]')).toBeNull();
  });
});
