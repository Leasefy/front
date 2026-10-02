/**
 * Nico, 01-10: «cuando uno se queda en la pantalla que pide el código un buen
 * rato y pone un código nuevo y nuevo y nuevo, dice que no sirve». La sesión
 * (1 h) vencía mientras esperaba y Supabase rechazaba el reto con «invalid
 * JWT… token is expired», que la pantalla mostraba como «Código incorrecto».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { supa, sesion, auth, toastError } = vi.hoisted(() => ({
  supa: { listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn() },
  sesion: { getSession: vi.fn(), refreshSession: vi.fn() },
  auth: { user: { id: 'u-1', role: 'agency' }, mfaRequired: true, setMfaVerified: vi.fn(), signOut: vi.fn() },
  toastError: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: supa, ...sesion } }),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));
vi.mock('@/components/settings/MfaSetupSection', () => ({ MfaSetupSection: () => null }));

import MfaVerifyPage from './mfa-verify/page';

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MfaVerifyPage />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function escribirElCodigo(codigo: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  for (let i = 0; i < codigo.length; i++) {
    const casillas = document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]');
    await act(async () => {
      setter.call(casillas[i]!, codigo[i]!);
      casillas[i]!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  supa.listFactors.mockReset().mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] } });
  supa.challenge.mockReset().mockResolvedValue({ data: { id: 'ch-1' }, error: null });
  supa.verify.mockReset().mockResolvedValue({ error: null });
  sesion.refreshSession.mockReset().mockResolvedValue({ error: null });
  toastError.mockReset();
  auth.setMfaVerified.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('/auth/mfa-verify — la sesión vence mientras se espera', () => {
  it('🔴 con la sesión vencida, la renueva ANTES del reto y el código bueno entra', async () => {
    const vencida = Math.floor(Date.now() / 1000) - 60;
    sesion.getSession.mockReset().mockResolvedValue({ data: { session: { expires_at: vencida } } });
    await montar();
    await escribirElCodigo('123456');

    expect(sesion.refreshSession).toHaveBeenCalledTimes(1);
    expect(sesion.refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      supa.challenge.mock.invocationCallOrder[0]!,
    );
    expect(auth.setMfaVerified).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('con la sesión vigente no la renueva de más', async () => {
    const enUnaHora = Math.floor(Date.now() / 1000) + 3600;
    sesion.getSession.mockReset().mockResolvedValue({ data: { session: { expires_at: enUnaHora } } });
    await montar();
    await escribirElCodigo('123456');

    expect(sesion.refreshSession).not.toHaveBeenCalled();
    expect(auth.setMfaVerified).toHaveBeenCalled();
  });

  it('🔴 si la sesión no se pudo renovar, lo dice: NO «Código incorrecto»', async () => {
    const enUnaHora = Math.floor(Date.now() / 1000) + 3600;
    sesion.getSession.mockReset().mockResolvedValue({ data: { session: { expires_at: enUnaHora } } });
    supa.challenge.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('invalid JWT: token has invalid claims: token is expired'), {
        status: 403,
        code: 'bad_jwt',
      }),
    });
    await montar();
    await escribirElCodigo('123456');

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0]![0]).toMatch(/sesión/);
    expect(toastError.mock.calls[0]![0]).not.toMatch(/Código incorrecto/);
  });
});

describe('/auth/mfa-verify — con qué cuenta (Nico, 01-10)', () => {
  it('🔴 muestra el correo de la cuenta que está verificando', async () => {
    (auth.user as { email?: string }).email = 'hola+27@leasefy.co';
    sesion.getSession.mockReset().mockResolvedValue({ data: { session: null } });
    await montar();
    expect(document.querySelector('[data-testid="mfa-verify-cuenta"]')?.textContent).toBe('hola+27@leasefy.co');
    delete (auth.user as { email?: string }).email;
  });
});

describe('/auth/mfa-verify — cuando ningún código sirve (Nico, 01-10)', () => {
  it('🔴 sin perfil cargado, el correo sale de la sesión de Supabase', async () => {
    sesion.getSession.mockReset().mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 'hola+27@leasefy.co' } } },
    });
    await montar();
    expect(document.querySelector('[data-testid="mfa-verify-cuenta"]')?.textContent).toBe('hola+27@leasefy.co');
  });

  it('🔴 tras 3 códigos rechazados dice qué pasa y ofrece restablecer por correo', async () => {
    sesion.getSession.mockReset().mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 'hola+27@leasefy.co' } } },
    });
    supa.verify.mockResolvedValue({
      error: Object.assign(new Error('Invalid TOTP code entered'), { status: 422, code: 'mfa_verification_failed' }),
    });
    await montar();
    for (const codigo of ['111111', '222222']) await escribirElCodigo(codigo);
    expect(document.querySelector('[data-testid="mfa-verify-ninguno-sirve"]')).toBeNull();
    await escribirElCodigo('333333');
    const aviso = document.querySelector('[data-testid="mfa-verify-ninguno-sirve"]');
    expect(aviso?.textContent).toContain('hola+27@leasefy.co');
    expect(aviso?.textContent).toContain('Restablecer con un código al correo');
  });
});

/**
 * 02-10-2026 · La regla de oro: si lo que falló fue la red o Supabase, el
 * código no tuvo la culpa — ni «Código incorrecto» ni las casillas en rojo.
 */
describe('/auth/mfa-verify — la red o Supabase, no el código', () => {
  const casillasEnRojo = () =>
    [...document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')].some((c) =>
      c.className.includes('border-danger'),
    );

  beforeEach(() => {
    sesion.getSession.mockReset().mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
    });
  });

  it('🔴 sin respuesta: habla de la conexión y no pinta el código en rojo', async () => {
    supa.challenge.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 }),
    });
    await montar();
    await escribirElCodigo('123456');
    expect(toastError.mock.calls[0]![0]).toMatch(/conexión/);
    expect(toastError.mock.calls[0]![0]).not.toMatch(/Código incorrecto/);
    expect(casillasEnRojo()).toBe(false);
  });

  it('🔴 un 5xx de Supabase: falló de nuestro lado, sin culpar al código', async () => {
    supa.verify.mockResolvedValue({
      error: Object.assign(new Error('Internal Server Error'), { name: 'AuthApiError', status: 500 }),
    });
    await montar();
    await escribirElCodigo('123456');
    expect(toastError.mock.calls[0]![0]).toMatch(/de nuestro lado/);
    expect(casillasEnRojo()).toBe(false);
  });

  it('un código malo sí pinta las casillas en rojo', async () => {
    supa.verify.mockResolvedValue({
      error: Object.assign(new Error('Invalid TOTP code entered'), { status: 422, code: 'mfa_verification_failed' }),
    });
    await montar();
    await escribirElCodigo('123456');
    expect(toastError.mock.calls[0]![0]).toMatch(/Código incorrecto/);
    expect(casillasEnRojo()).toBe(true);
  });
});
