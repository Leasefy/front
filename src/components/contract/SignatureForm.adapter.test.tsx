/**
 * T-0109 WU-5 slice 3/4 — `SignatureForm` gana un `adapter` inyectable (igual
 * que `OTPVerification`, contract.md §3.1.C7/D4) para firmar procesos que NO
 * son un contrato de arriendo (la firma del representante de la agencia y la
 * del copropietario en la consignación) sin tener que reimplementar el
 * formulario completo. `contractId`/`role` siguen siendo el transporte por
 * DEFECTO — el flujo de arriendo (SignatureForm.test.tsx) no cambia.
 *
 * También gana `rolLabel` para no mostrar "Arrendador"/"Arrendatario" cuando
 * quien firma es un representante de agencia o un propietario.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (v: string | null) => void }) => (
    <button data-testid="dibujar-firma" onClick={() => onChange('data:image/png;base64,x')}>
      Dibujar
    </button>
  ),
}));

const otpVerificationProps = vi.fn();
vi.mock('./OTPVerification', () => ({
  OTPVerification: (props: { isOpen: boolean; onVerified: (t: string) => void }) => {
    otpVerificationProps(props);
    return props.isOpen ? (
      <button data-testid="otp-verificar" onClick={() => props.onVerified('tok-1')}>
        Verificar OTP
      </button>
    ) : (
      <div data-testid="otp-cerrado" />
    );
  },
}));

import { SignatureForm } from './SignatureForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  otpVerificationProps.mockClear();
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

describe('<SignatureForm adapter> — transporte inyectado (T-0109)', () => {
  it('forwards a custom adapter to OTPVerification instead of building a contract transport', () => {
    const adapter = {
      send: vi.fn().mockResolvedValue({ sentTo: 'a***@x.com', cooldownSeconds: 60 }),
      verify: vi.fn().mockResolvedValue({ verificationToken: 'tok-1' }),
    };

    act(() => {
      root.render(
        <SignatureForm onSign={vi.fn()} adapter={adapter} isLandlord={false} rolLabel="Propietario" requireOTP />
      );
    });

    expect(otpVerificationProps).toHaveBeenCalled();
    const lastCall = otpVerificationProps.mock.calls.at(-1)![0];
    expect(lastCall.adapter).toBe(adapter);
  });

  it('rolLabel overrides the default Arrendador/Arrendatario badge', () => {
    act(() => {
      root.render(
        <SignatureForm
          onSign={vi.fn()}
          adapter={{ send: vi.fn(), verify: vi.fn() }}
          isLandlord={false}
          rolLabel="Representante de la agencia"
        />
      );
    });
    expect(container.textContent).toContain('Representante de la agencia');
    expect(container.textContent).not.toContain('Arrendatario');
  });

  it('still signs end-to-end through the injected adapter (OTPVerification mocked shallow — adapter wiring covered above)', async () => {
    const adapter = { send: vi.fn(), verify: vi.fn() };
    const onSign = vi.fn();

    act(() => {
      root.render(
        <SignatureForm onSign={onSign} adapter={adapter} isLandlord={false} rolLabel="Propietario" requireOTP />
      );
    });
    await firmarConChecksYFirma();

    const firmarBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      /firmar/i.test(b.textContent ?? '')
    ) as HTMLButtonElement;
    act(() => { firmarBtn.click(); });

    await act(async () => {
      (container.querySelector('[data-testid="otp-verificar"]') as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(onSign).toHaveBeenCalledWith(expect.objectContaining({ otpVerificationToken: 'tok-1' }));
  });
});
