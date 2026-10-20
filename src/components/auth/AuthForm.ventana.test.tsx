/**
 * AuthForm en la ventana de cuenta (Nico, 19-10-2026: «dale un glow up al
 * login, algo hermoso por más que sea un modal»; Juan: «algo más sencillo»).
 *
 *  - UNA contraseña: sin «Confirmar contraseña» (el ojo y el medidor ya están).
 *  - Los títulos y botones los pone quien abre la ventana.
 *  - «Revisa tu correo» con el código de 6 dígitos: se confirma sin salir.
 *  - Google vuelve a donde iba la persona.
 *  - «Crear cuenta» desde entrar lo resuelve quien abrió la ventana.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { signUpWithEmailMock, confirmarMock, googleMock } = vi.hoisted(() => ({
  signUpWithEmailMock: vi.fn(),
  confirmarMock: vi.fn(),
  googleMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: googleMock,
    signInWithEmail: vi.fn(),
    signUpWithEmail: signUpWithEmailMock,
    resendSignUpEmail: vi.fn().mockResolvedValue(undefined),
    confirmarCorreoConCodigo: confirmarMock,
    sendPasswordReset: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
    agencyRole: null,
    agencyMembershipChecked: false,
    hasActiveAgencyMembership: false,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }));
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}));

import { AuthForm } from './AuthForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  sessionStorage.clear();
  signUpWithEmailMock.mockReset();
  confirmarMock.mockReset();
  googleMock.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

function escribir(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

type Props = React.ComponentProps<typeof AuthForm>;

async function pintar(props: Props) {
  await act(async () => {
    root.render(<AuthForm defaultMode="register" variante="ventana" {...props} />);
  });
}

async function crearCuenta(props: Props) {
  await pintar(props);
  await act(async () => {
    escribir(container.querySelector('input[name="email"]') as HTMLInputElement, 'nueva@example.com');
    escribir(container.querySelector('input[name="password"]') as HTMLInputElement, 'Secreta#2026');
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

async function escribirElCodigo(codigo: string) {
  const casillas = Array.from(
    container.querySelectorAll<HTMLInputElement>('[data-testid="confirmar-con-codigo"] input[inputmode="numeric"]'),
  );
  expect(casillas).toHaveLength(6);
  for (let i = 0; i < codigo.length; i++) {
    await act(async () => {
      escribir(casillas[i], codigo[i]);
    });
  }
}

describe('AuthForm en la ventana (19-10-2026)', () => {
  it('pide UNA contraseña y crea la cuenta con el perfil elegido', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true });
    await crearCuenta({ defaultRole: 'agency', returnUrl: '/panel/inmobiliaria/inmuebles/nuevo' });
    expect(container.querySelector('input[name="confirmPassword"]')).toBeNull();
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1);
    const [correo, clave, , perfil] = signUpWithEmailMock.mock.calls[0];
    expect(correo).toBe('nueva@example.com');
    expect(clave).toBe('Secreta#2026');
    expect(perfil).toBe('agency');
    expect(container.textContent).toContain('Revisa tu correo');
  });

  it('la página /auth sigue pidiendo confirmar la contraseña', async () => {
    await act(async () => {
      root.render(<AuthForm defaultMode="register" />);
    });
    expect(container.querySelector('input[name="confirmPassword"]')).not.toBeNull();
  });

  it('los títulos y botones los pone quien abre la ventana', async () => {
    await pintar({
      textos: { registroTitulo: 'Crea tu cuenta gratis', registroDetalle: 'Después publicas.', registroBoton: 'Crear cuenta y publicar' },
      encimaDelRegistro: <button type="button" data-testid="encima">Inmobiliaria · Cambiar</button>,
    });
    expect(container.querySelector('h1')?.textContent).toBe('Crea tu cuenta gratis');
    expect(container.textContent).toContain('Después publicas.');
    expect(container.querySelector('button[type="submit"]')?.textContent).toContain('Crear cuenta y publicar');
    expect(container.querySelector('[data-testid="encima"]')).not.toBeNull();
  });

  it('con código: «Revisa tu correo» pide los 6 dígitos y al completarlos confirma solo', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true });
    confirmarMock.mockResolvedValue({ id: 'u1' });
    await crearCuenta({ defaultRole: 'landlord', returnUrl: '/publicar', confirmarConCodigo: true });
    expect(container.textContent).toContain('Te enviamos un código de 6 dígitos a nueva@example.com');
    await escribirElCodigo('123456');
    expect(confirmarMock).toHaveBeenCalledTimes(1);
    expect(confirmarMock).toHaveBeenCalledWith('nueva@example.com', '123456');
  });

  it('un código malo o vencido se dice bajo el campo y se puede escribir otra vez', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true });
    confirmarMock.mockRejectedValue(Object.assign(new Error('Token has expired or is invalid'), { status: 403, code: 'otp_expired' }));
    await crearCuenta({ defaultRole: 'landlord', returnUrl: '/publicar', confirmarConCodigo: true });
    await escribirElCodigo('999999');
    expect(container.textContent).toContain('Ese código no sirve');
    const casillas = container.querySelectorAll<HTMLInputElement>('[data-testid="confirmar-con-codigo"] input[inputmode="numeric"]');
    expect(Array.from(casillas).every((c) => c.value === '')).toBe(true);
  });

  it('sin código, «Revisa tu correo» es el de siempre (el enlace)', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true });
    await crearCuenta({ defaultRole: 'landlord', returnUrl: '/publicar' });
    expect(container.querySelector('[data-testid="confirmar-con-codigo"]')).toBeNull();
    expect(container.textContent).toContain('Enviamos un enlace de confirmación');
  });

  it('Google vuelve a donde iba la persona', async () => {
    await pintar({ defaultRole: 'agency', returnUrl: '/panel/inmobiliaria/inmuebles/nuevo' });
    const google = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Google'))!;
    await act(async () => {
      google.click();
    });
    expect(googleMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles/nuevo');
  });

  it('«Crear cuenta» desde entrar lo resuelve quien abrió la ventana, con el correo escrito', async () => {
    const alCrearCuenta = vi.fn();
    await act(async () => {
      root.render(<AuthForm defaultMode="login" variante="ventana" alCrearCuenta={alCrearCuenta} />);
    });
    await act(async () => {
      escribir(container.querySelector('input[name="email"]') as HTMLInputElement, 'yo@example.com');
    });
    const crear = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Crear cuenta')!;
    await act(async () => {
      crear.click();
    });
    expect(alCrearCuenta).toHaveBeenCalledWith('yo@example.com');
    // No cambió a «Crea tu cuenta» por dentro: eso lo decide la ventana.
    expect(container.querySelector('h1')?.textContent).toBe('Bienvenido de vuelta');
  });
});
