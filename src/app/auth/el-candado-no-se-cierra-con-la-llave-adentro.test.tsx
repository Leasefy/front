/**
 * 🔴 EL CANDADO NO SE CIERRA CON LA LLAVE ADENTRO (21-09-2026).
 *
 * Con el segundo factor obligatorio para ADMIN y CONTADOR, quien NO tiene
 * ningún factor inscrito —o sea todo el mundo, el día que esto se despliega—
 * caía en `/auth/mfa-verify` y se encontraba con «Ingresa el código de 6
 * dígitos de tu app de autenticación». No hay app. No hay código. El botón
 * «Verificar» queda muerto y la única salida es «Cerrar sesión».
 *
 * Y no se puede ir a activarlo a Configuración → Seguridad: `ProtectedRoute`
 * devuelve a esta pantalla mientras el segundo factor haga falta.
 *
 * Reproducido en el navegador con la cuenta de QA sin factor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { supa, auth } = vi.hoisted(() => ({
  supa: { listFactors: vi.fn() },
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

beforeEach(() => {
  supa.listFactors.mockReset();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('/auth/mfa-verify', () => {
  it('🔴 sin ningún factor inscrito OFRECE inscribirlo, no pide un código que no existe', async () => {
    supa.listFactors.mockResolvedValue({ data: { totp: [] } });
    await montar();

    expect(document.querySelector('[data-testid="mfa-setup"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Activa tu segundo factor');
    // El campo del código NO puede estar: no hay código que escribir.
    expect(document.querySelector('input')).toBeNull();
  });

  it('con un factor verificado sí pide el código', async () => {
    supa.listFactors.mockResolvedValue({
      data: { totp: [{ id: 'f-1', status: 'verified' }] },
    });
    await montar();

    expect(document.querySelector('input')).not.toBeNull();
    expect(document.body.textContent).toContain('código de 6 dígitos');
    expect(document.querySelector('[data-testid="mfa-setup"]')).toBeNull();
  });

  it('un factor SIN verificar tampoco sirve para pedir código: se ofrece inscribirlo', async () => {
    supa.listFactors.mockResolvedValue({
      data: { totp: [{ id: 'f-1', status: 'unverified' }] },
    });
    await montar();

    expect(document.querySelector('[data-testid="mfa-setup"]')).not.toBeNull();
  });

  it('si ni siquiera se pudo preguntar, ofrece inscribirlo: es la salida que sirve', async () => {
    supa.listFactors.mockRejectedValue(new Error('sin red'));
    await montar();

    expect(document.querySelector('[data-testid="mfa-setup"]')).not.toBeNull();
  });
});
