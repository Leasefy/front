/**
 * /auth/mfa-verify: mientras se verifica el código, TODO queda bloqueado.
 *
 * Nico, 24-09: «cuando uno ponga el código de verificación debe bloquearse
 * todo para que no le den clic en verificar por si se demora mucho la
 * petición». Pasaban dos cosas: el sexto dígito envía solo y un clic en
 * «Verificar» antes del siguiente render enviaba otra vez el mismo código; y
 * al verificar bien, el `finally` soltaba el botón mientras la navegación
 * seguía en camino, así que se podía volver a hacer clic con el código usado.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { supa, auth } = vi.hoisted(() => ({
  supa: { listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn() },
  auth: {
    user: { id: 'u-1', role: 'agency' },
    mfaRequired: true,
    setMfaVerified: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: supa } }),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: () => <div data-testid="mfa-setup">acá se inscribe</div>,
}));

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

/** Escribe un dígito en una casilla como lo haría el teclado. */
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function escribirElCodigo(codigo: string) {
  for (let i = 0; i < codigo.length; i++) {
    const casillas = document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]');
    await act(async () => {
      escribir(casillas[i]!, codigo[i]!);
    });
  }
}

function botonVerificar(): HTMLButtonElement {
  const b = [...document.querySelectorAll('button')].find((x) => /Verific/.test(x.textContent ?? ''));
  return b as HTMLButtonElement;
}

function botonPorTexto(texto: RegExp): HTMLButtonElement {
  return [...document.querySelectorAll('button')].find((x) => texto.test(x.textContent ?? '')) as HTMLButtonElement;
}

beforeEach(() => {
  supa.listFactors.mockReset().mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] } });
  supa.challenge.mockReset().mockResolvedValue({ data: { id: 'ch-1' }, error: null });
  supa.verify.mockReset();
  auth.setMfaVerified.mockReset();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('/auth/mfa-verify: todo bloqueado mientras se verifica', () => {
  it('el sexto dígito envía y un clic en «Verificar» mientras tanto NO envía otra vez', async () => {
    let terminar!: (v: { error: null }) => void;
    supa.verify.mockReturnValue(new Promise((r) => (terminar = r)));
    await montar();

    await escribirElCodigo('559008');
    await act(async () => {
      botonVerificar().click();
      botonVerificar().click();
    });

    expect(supa.challenge).toHaveBeenCalledTimes(1);
    await act(async () => {
      terminar({ error: null });
    });
    expect(supa.verify).toHaveBeenCalledTimes(1);
  });

  it('mientras se verifica: el botón, las casillas, «activarla ahora» y «Cerrar sesión» quedan deshabilitados', async () => {
    supa.verify.mockReturnValue(new Promise(() => {}));
    await montar();

    await escribirElCodigo('559008');

    expect(botonVerificar().disabled).toBe(true);
    expect(botonVerificar().textContent).toMatch(/Verificando/);
    for (const c of document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')) {
      expect(c.disabled).toBe(true);
    }
    expect(botonPorTexto(/activarla ahora/).disabled).toBe(true);
    expect(botonPorTexto(/Cerrar sesión/).disabled).toBe(true);
  });

  it('🔴 si salió bien, sigue bloqueado hasta que la pantalla cambie (no vuelve a «Verificar»)', async () => {
    supa.verify.mockResolvedValue({ error: null });
    await montar();

    await escribirElCodigo('559008');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(auth.setMfaVerified).toHaveBeenCalledTimes(1);
    expect(botonVerificar().disabled).toBe(true);
    await act(async () => {
      botonVerificar().click();
    });
    expect(supa.verify).toHaveBeenCalledTimes(1);
  });

  it('si el código falla, se desbloquea para intentar con el siguiente', async () => {
    supa.verify.mockResolvedValue({ error: new Error('Invalid TOTP code entered') });
    await montar();

    await escribirElCodigo('000000');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(botonPorTexto(/Cerrar sesión/).disabled).toBe(false);
    for (const c of document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')) {
      expect(c.disabled).toBe(false);
    }
  });
});
