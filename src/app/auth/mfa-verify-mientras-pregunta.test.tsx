/**
 * Nico, 01-10: dos capturas de /auth/mfa-verify con la misma cuenta y textos
 * distintos abajo — en una «¿Todavía no tienes la app de autenticación? ·
 * Actívala ahora» y sin el correo; en la otra «¿Cambiaste de celular…? ·
 * Restablécelo con un código a tu correo» y con el correo.
 *
 * La primera era la pantalla mientras preguntaba si hay factor: el pie
 * adivinaba «no la tiene». Y al recargar, el token todavía no estaba en
 * memoria, la pregunta por HTTP se rendía y quedaba colgada del SDK: la
 * adivinanza se quedaba, y «Verificar» no tenía factor con qué verificar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { supa, sesion, auth, token } = vi.hoisted(() => ({
  supa: { listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn() },
  sesion: { getSession: vi.fn(), refreshSession: vi.fn() },
  auth: {
    user: { id: 'u-1', role: 'agency' } as Record<string, unknown>,
    mfaRequired: true,
    mfaEnrollRequired: false,
    isLoading: false,
    setMfaVerified: vi.fn(),
    signOut: vi.fn(),
  },
  token: { actual: null as string | null },
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: supa, ...sesion } }),
}));
// `hayRespuestaDeSesion` en false: el AuthProvider todavía no contestó (recién recargada).
vi.mock('@/lib/api/client', () => ({ getAccessToken: () => token.actual, hayRespuestaDeSesion: () => false }));
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: () => <div data-testid="mfa-setup" />,
}));

import MfaVerifyPage from './mfa-verify/page';

/** Un token con forma de JWT: el front sólo lee las claims, no la firma. */
function tokenCon(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(claims)}.firma`;
}

const nunca = () => new Promise<never>(() => {});
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
}

const $ = (testid: string) => document.querySelector<HTMLElement>(`[data-testid="${testid}"]`);

async function escribirElCodigo(codigo: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  for (let i = 0; i < codigo.length; i++) {
    const casillas = document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]');
    await act(async () => {
      setter.call(casillas[i]!, codigo[i]!);
      casillas[i]!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  await esperar(0);
}

beforeEach(() => {
  token.actual = null;
  auth.user = { id: 'u-1', role: 'agency' };
  supa.listFactors.mockReset().mockImplementation(nunca); // el candado del SDK tomado
  supa.challenge.mockReset().mockResolvedValue({ data: { id: 'ch-1' }, error: null });
  supa.verify.mockReset().mockResolvedValue({ error: null });
  sesion.getSession.mockReset().mockImplementation(nunca);
  sesion.refreshSession.mockReset().mockResolvedValue({ error: null });
  auth.setMfaVerified.mockReset();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supa.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ factors: [{ id: 'f-http', factor_type: 'totp', status: 'verified' }] }),
    })),
  );
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('/auth/mfa-verify — mientras pregunta si hay factor (Nico, 01-10)', () => {
  it('🔴 el pie dice desde el principio el texto del que tiene la app: nada de «¿Todavía no tienes la app?»', async () => {
    await montar();

    const pie = $('no-tengo-la-app')!.parentElement!;
    expect(pie.textContent).toContain('¿Cambiaste de celular, borraste la app o ningún código funciona?');
    expect(pie.textContent).toContain('Restablécelo con un código a tu correo');
    expect(document.body.textContent).not.toContain('Todavía no tienes la app');
    expect(document.body.textContent).not.toContain('Actívala ahora');
  });

  it('🔴 el token llega DESPUÉS de montar (recargar la página): el factor se resuelve por HTTP y el código entra', async () => {
    sesion.getSession.mockReset().mockResolvedValue({ data: { session: null } });
    await montar();
    // El AuthProvider pone el token un instante después.
    token.actual = tokenCon({ email: 'hola+inmobiliaria3@leasefy.co' });
    await esperar(400);

    expect(fetch).toHaveBeenCalledWith(
      'https://supa.test/auth/v1/user',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${token.actual}` }) }),
    );
    await escribirElCodigo('123456');
    expect(supa.challenge).toHaveBeenCalledWith({ factorId: 'f-http' });
    expect(auth.setMfaVerified).toHaveBeenCalled();
  });
});

describe('/auth/mfa-verify — el correo de la cuenta sin saltos (Nico, 01-10)', () => {
  it('🔴 con el token ya en memoria, el correo sale en la primera pintada aunque el SDK no conteste', async () => {
    token.actual = tokenCon({ email: 'hola+inmobiliaria3@leasefy.co' });
    await montar();

    expect($('mfa-verify-cuenta')?.textContent).toBe('hola+inmobiliaria3@leasefy.co');
    expect($('mfa-verify-cuenta-cargando')).toBeNull();
  });

  it('mientras lo busca, la píldora guarda su sitio; cuando llega el token, aparece el correo', async () => {
    await montar();
    expect($('mfa-verify-cuenta')).toBeNull();
    expect($('mfa-verify-cuenta-cargando')).not.toBeNull();

    token.actual = tokenCon({ email: 'hola+inmobiliaria3@leasefy.co' });
    await esperar(400);

    expect($('mfa-verify-cuenta')?.textContent).toBe('hola+inmobiliaria3@leasefy.co');
    expect($('mfa-verify-cuenta-cargando')).toBeNull();
  });
});
