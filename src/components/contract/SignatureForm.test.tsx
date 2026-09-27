/**
 * T-0109 contract.md §3.3 — `TOKEN_DE_FIRMA_INVALIDO` / `CODIGO_DE_FIRMA_REQUERIDO`
 * dejan el `otpVerificationToken` guardado inservible. Antes de esto,
 * `onSign` era fire-and-forget: si el back rechazaba la firma por esos
 * códigos, el formulario seguía creyendo que tenía un token válido y un
 * segundo click reintentaba con el MISMO token, repitiendo el mismo 400 en
 * bucle — sin volver a abrir el modal de OTP.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

void React;

// El canvas de firma no vale la pena montarlo acá — sólo hace falta que
// dispare `onChange` con un data URL cualquiera.
vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (v: string | null) => void }) => (
    <button data-testid="dibujar-firma" onClick={() => onChange('data:image/png;base64,x')}>
      Dibujar
    </button>
  ),
}));

// El modal real trae Dialog/Radix + fetch; acá sólo hace falta ver si está
// abierto y disparar `onVerified` a mano.
vi.mock('./OTPVerification', () => ({
  OTPVerification: ({ isOpen, onVerified }: { isOpen: boolean; onVerified: (t: string) => void }) =>
    isOpen ? (
      <button data-testid="otp-verificar" onClick={() => onVerified('tok-1')}>
        Verificar OTP
      </button>
    ) : (
      <div data-testid="otp-cerrado" />
    ),
}));

import { SignatureForm } from './SignatureForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function firmarConChecksYFirma() {
  act(() => {
    (container.querySelector('[data-testid="dibujar-firma"]') as HTMLButtonElement).click();
  });
  const checks = container.querySelectorAll('input[type="checkbox"]');
  act(() => {
    checks.forEach((c) => (c as HTMLInputElement).click());
  });
}

describe('<SignatureForm> — reinicio del OTP ante un token inservible (T-0109)', () => {
  it('cuando onSign rechaza con TOKEN_DE_FIRMA_INVALIDO, limpia el token y reabre el modal de OTP', async () => {
    const onSign = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(400, 'Token inválido.', 'TOKEN_DE_FIRMA_INVALIDO'));

    act(() => {
      root.render(
        <SignatureForm onSign={onSign} contractId="c-1" isLandlord requireOTP />
      );
    });

    await firmarConChecksYFirma();

    // Botón real de "Firmar contrato" — se busca por texto para no acoplar a clases.
    // Con requireOTP=true y sin token, este click sólo abre el modal de OTP.
    const firmarBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      /firmar contrato/i.test(b.textContent ?? '')
    ) as HTMLButtonElement;
    act(() => { firmarBtn.click(); });

    expect(container.querySelector('[data-testid="otp-verificar"]')).not.toBeNull();

    await act(async () => {
      (container.querySelector('[data-testid="otp-verificar"]') as HTMLButtonElement).click();
      // handleOTPVerified espera 300ms antes de llamar a onSign.
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(onSign).toHaveBeenCalledTimes(1);
    expect(onSign).toHaveBeenCalledWith(
      expect.objectContaining({ otpVerificationToken: 'tok-1' })
    );

    // El rechazo debió limpiar el token y reabrir el modal — se ve porque
    // vuelve a aparecer el disparador del mock (isOpen=true).
    expect(container.querySelector('[data-testid="otp-verificar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="otp-cerrado"]')).toBeNull();
  });

  it('un rechazo que NO es de token (p.ej. un 409 de negocio) no reabre el OTP', async () => {
    const onSign = vi.fn().mockRejectedValueOnce(new ApiError(409, 'x', 'DOCUMENTO_CAMBIO_DESDE_LA_FIRMA'));

    act(() => {
      root.render(<SignatureForm onSign={onSign} contractId="c-1" isLandlord requireOTP />);
    });
    await firmarConChecksYFirma();

    const firmarBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      /firmar contrato/i.test(b.textContent ?? '')
    ) as HTMLButtonElement;
    act(() => { firmarBtn.click(); });

    await act(async () => {
      (container.querySelector('[data-testid="otp-verificar"]') as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(onSign).toHaveBeenCalledTimes(1);
    // El modal se había cerrado al verificar (setShowOTP(false)) y el
    // rechazo NO es de token: sigue cerrado.
    expect(container.querySelector('[data-testid="otp-cerrado"]')).not.toBeNull();
  });
});
