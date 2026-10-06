/**
 * Nico, 05-10: dejó /auth/mfa-verify abierta mucho rato, la sesión murió y al
 * RECARGAR la pantalla decía «Activa tu segundo factor» a quien ya lo tenía:
 * sin sesión las dos preguntas por el factor fallaban y eso se leía como «no
 * tiene factor». Sin sesión no hay nada que preguntar: va a la contraseña.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { supa, sesion, auth, cliente, navegar, toastError } = vi.hoisted(() => ({
  supa: { listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn() },
  sesion: { getSession: vi.fn(), refreshSession: vi.fn() },
  auth: {
    user: null as Record<string, unknown> | null,
    mfaRequired: true,
    mfaEnrollRequired: false,
    isLoading: false,
    setMfaVerified: vi.fn(),
    signOut: vi.fn(),
  },
  cliente: { token: null as string | null, respondio: true },
  navegar: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: supa, ...sesion } }),
}));
vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => cliente.token,
  hayRespuestaDeSesion: () => cliente.respondio,
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: navegar }) }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));
vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: () => <div data-testid="mfa-setup" />,
}));

import MfaVerifyPage from './mfa-verify/page';

const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MfaVerifyPage />);
  });
  await esperar(0);
  await esperar(0);
}

const sinSesionDelSdk = () =>
  Object.assign(new Error('Auth session missing!'), { name: 'AuthSessionMissingError', status: 400 });

beforeEach(() => {
  window.history.replaceState(null, '', '/auth/mfa-verify?returnUrl=%2Fpanel%2Finmobiliaria%2Fpagos');
  supa.listFactors.mockReset();
  sesion.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  auth.signOut.mockReset().mockResolvedValue(undefined);
  navegar.mockReset();
  toastError.mockReset();
  cliente.token = null;
  cliente.respondio = true;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('/auth/mfa-verify — al recargar con la sesión muerta', () => {
  it('🔴 no ofrece ACTIVAR el factor: va a la contraseña con su destino', async () => {
    supa.listFactors.mockResolvedValue({ data: null, error: sinSesionDelSdk() });
    await montar();

    expect(navegar).toHaveBeenCalledWith('/auth?returnUrl=%2Fpanel%2Finmobiliaria%2Fpagos');
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Tu sesión se cerró. Vuelve a entrar con tu contraseña.');
    expect(document.body.textContent).not.toMatch(/Activa tu segundo factor/);
    expect(document.querySelector('[data-testid="mfa-setup"]')).toBeNull();
  });

  it('🔴 sin token y con el AuthProvider ya contestado, si el SDK no contesta (candado) va a la contraseña a los 3 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    supa.listFactors.mockReturnValue(new Promise(() => {}));
    await montar();
    expect(navegar).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_500);
    });
    expect(navegar).toHaveBeenCalledWith('/auth?returnUrl=%2Fpanel%2Finmobiliaria%2Fpagos');
    expect(document.body.textContent).not.toMatch(/Activa tu segundo factor/);
    vi.useRealTimers();
  });

  it('un token viejo que Supabase rechaza (401) pero que el SDK sí renueva: se queda en el código', async () => {
    cliente.token = 'token-viejo';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    supa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] }, error: null });
    await montar();

    expect(navegar).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-testid^="casilla-"]').length).toBe(6);
  });

  it('si no se pudo preguntar (sin red) y la sesión no está muerta, sigue ofreciendo activarlo como antes', async () => {
    cliente.token = 'token';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    supa.listFactors.mockResolvedValue({ data: null, error: Object.assign(new Error('Failed to fetch'), { status: 0 }) });
    await montar();

    expect(navegar).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
