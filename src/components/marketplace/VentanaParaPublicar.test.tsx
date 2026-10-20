/**
 * La ventana de publicar sin cuenta (Juan y Nico, 19-10-2026): primero
 * «¿Quién va a publicar?» —propietario o inmobiliaria, un toque y avanza— y
 * después la cuenta, con el perfil elegido y su destino.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// El marco (Radix) y la animación no importan aquí: sólo el contenido.
vi.mock('@/components/auth/ventana/VentanaDeCuenta', () => ({
  VentanaDeCuenta: ({ abierta, children }: { abierta: boolean; children: React.ReactNode }) =>
    abierta ? <div data-testid="marco">{children}</div> : null,
  TextoDeLaObra: () => null,
}));
vi.mock('@/components/auth/ventana/InmuebleQueSePublica', () => ({ InmuebleQueSePublica: () => null }));
vi.mock('@leasefy/cadence', () => ({ CrossFade: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

type PropsDelFormulario = {
  defaultMode?: string;
  defaultRole?: string;
  returnUrl?: string;
  correoInicial?: string;
  encimaDelRegistro?: React.ReactNode;
  textos?: { registroBoton?: string };
  alCrearCuenta?: (correo: string) => void;
};
const { ultimo } = vi.hoisted(() => ({ ultimo: { props: null as PropsDelFormulario | null } }));
vi.mock('@/components/auth/AuthForm', () => ({
  AuthForm: (props: PropsDelFormulario) => {
    ultimo.props = props;
    return (
      <div data-testid="formulario" data-modo={props.defaultMode} data-perfil={props.defaultRole ?? ''} data-destino={props.returnUrl ?? ''}>
        {props.encimaDelRegistro}
      </div>
    );
  },
}));

import { VentanaParaPublicar } from './VentanaParaPublicar';

let container: HTMLDivElement;
let root: Root;
const DESTINOS = { landlord: '/publicar', agency: '/panel/inmobiliaria/inmuebles/nuevo' };

beforeEach(() => {
  ultimo.props = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<VentanaParaPublicar abierta alCambiar={() => {}} destinos={DESTINOS} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const tocar = (id: string) =>
  act(() => {
    container.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click();
  });

describe('VentanaParaPublicar', () => {
  it('empieza preguntando quién publica, sin formulario todavía', () => {
    expect(container.textContent).toContain('¿Quién va a publicar?');
    expect(container.querySelector('[data-testid="publica-propietario"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="publica-inmobiliaria"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="formulario"]')).toBeNull();
  });

  it('inmobiliaria: un toque y pasa a la cuenta con su perfil y su destino', () => {
    tocar('publica-inmobiliaria');
    const f = container.querySelector('[data-testid="formulario"]')!;
    expect(f.getAttribute('data-modo')).toBe('register');
    expect(f.getAttribute('data-perfil')).toBe('agency');
    expect(f.getAttribute('data-destino')).toBe('/panel/inmobiliaria/inmuebles/nuevo');
    expect(container.textContent).toContain('Inmobiliaria');
    expect(ultimo.props?.textos?.registroBoton).toBe('Crear cuenta y publicar');
  });

  it('propietario: su perfil y su destino; «Cambiar» vuelve a elegir', () => {
    tocar('publica-propietario');
    expect(container.querySelector('[data-testid="formulario"]')!.getAttribute('data-perfil')).toBe('landlord');
    expect(container.querySelector('[data-testid="formulario"]')!.getAttribute('data-destino')).toBe('/publicar');
    tocar('cambiar-quien-publica');
    expect(container.textContent).toContain('¿Quién va a publicar?');
  });

  it('quien ya tiene cuenta entra directo; «Crear cuenta» lo devuelve a elegir con su correo', () => {
    tocar('publicar-ya-tengo-cuenta');
    const f = container.querySelector('[data-testid="formulario"]')!;
    expect(f.getAttribute('data-modo')).toBe('login');
    expect(f.getAttribute('data-perfil')).toBe('');
    act(() => ultimo.props!.alCrearCuenta!('yo@example.com'));
    expect(container.textContent).toContain('¿Quién va a publicar?');
    tocar('publica-propietario');
    expect(ultimo.props?.correoInicial).toBe('yo@example.com');
  });
});
