/**
 * ARREGLOS-7 (de ARREGLOS-3, 03-10-2026) · El modal del código decía «solo tú
 * puedes firmar este contrato» también cuando el inquilino firmaba el ACTA de
 * entrega por su enlace. Quien lo usa dice qué se firma; sin decirlo, el
 * contrato de siempre.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { OTPVerification, type OtpAdapter } from './OTPVerification';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const adapter = (): OtpAdapter => ({
  send: vi.fn().mockResolvedValue({ sentTo: 'i***@example.test', cooldownSeconds: 60 }),
  verify: vi.fn().mockResolvedValue({ verificationToken: 'tok-1' }),
});

async function abrir(props: Partial<React.ComponentProps<typeof OTPVerification>> = {}) {
  await act(async () => {
    root.render(
      <OTPVerification isOpen adapter={adapter()} onVerified={vi.fn()} onCancel={vi.fn()} {...props} />,
    );
  });
  // El diálogo vive en un portal: se lee del documento entero.
  return document.body.textContent ?? '';
}

describe('<OTPVerification> — qué se firma', () => {
  it('en el acta dice «solo tú puedes firmar el acta», no «este contrato»', async () => {
    const texto = await abrir({ queSeFirma: 'el acta' });
    expect(texto).toContain('solo tú puedes firmar el acta.');
    expect(texto).not.toContain('firmar este contrato');
  });

  it('sin decir qué se firma, sigue diciendo «este contrato»', async () => {
    const texto = await abrir();
    expect(texto).toContain('solo tú puedes firmar este contrato.');
  });
});
