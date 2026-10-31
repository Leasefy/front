/**
 * CONTR-4 (QA de agentes 17-10) · Al firmar el inventario justo después del
 * contrato, el código del contrato salió hace menos de un minuto y el back
 * responde 429 CODIGO_EN_ESPERA. El diálogo se quedaba con «Espera 16
 * segundos» fijo, sin campo ni botón: la única salida era Cancelar. Ahora
 * cuenta la espera en vivo y pide el código solo al llegar a cero.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
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

const enEspera = (segundos: number) =>
  new ApiError(
    429,
    `Ya enviamos un código hace poco. Espera ${segundos} segundos antes de pedir otro.`,
    'CODIGO_EN_ESPERA',
    { segundos },
  );

describe('<OTPVerification> — la espera de reenvío del back (CONTR-4)', () => {
  it('cuenta la espera sin mostrar un error y, al llegar a cero, pide el código solo', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(enEspera(1))
      .mockResolvedValueOnce({ sentTo: 'i***@example.test', cooldownSeconds: 60 });
    const adapter: OtpAdapter = { send, verify: vi.fn() };

    await act(async () => {
      root.render(<OTPVerification isOpen adapter={adapter} onVerified={vi.fn()} onCancel={vi.fn()} />);
    });
    const durante = document.body.textContent ?? '';
    expect(send).toHaveBeenCalledTimes(1);
    expect(durante).toContain('Te enviamos un código hace un momento. Pedimos uno nuevo en');
    // No es un error de la persona: nada de la frase del 429 en rojo.
    expect(durante).not.toContain('Espera 1 segundos');
    expect(document.querySelector('[data-testid="otp-esperando"]')).not.toBeNull();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 1300));
    });
    expect(send).toHaveBeenCalledTimes(2);
    const despues = document.body.textContent ?? '';
    expect(despues).toContain('i***@example.test');
    expect(document.querySelectorAll('input[aria-label^="Dígito"]').length).toBe(6);
  });

  it('cualquier otro fallo del envío sigue mostrándose como error, sin reintentar', async () => {
    const send = vi.fn().mockRejectedValue(new ApiError(400, 'No se pudo entregar el código.', 'CODIGO_NO_ENTREGADO'));
    const adapter: OtpAdapter = { send, verify: vi.fn() };
    await act(async () => {
      root.render(<OTPVerification isOpen adapter={adapter} onVerified={vi.fn()} onCancel={vi.fn()} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(document.body.textContent).toContain('No se pudo entregar el código.');
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('<OTPVerification> — el freno de los códigos (Nico 30-10: «no le debiste haber dejado enviar si estaba bloqueado»)', () => {
  const freno = (segundos: number) =>
    new ApiError(429, `Hiciste demasiadas solicitudes seguidas. Espera 5 minutos y vuelve a intentar.`, 'DEMASIADAS_SOLICITUDES', {
      reintentarEnSegundos: segundos,
    });

  it('al verificar bloqueado: sin «Reenviar», sin el «Enviado por correo» viejo, con lo que falta; al terminar pide el código solo', async () => {
    vi.useFakeTimers();
    try {
      const send = vi.fn().mockResolvedValue({ sentTo: 'ju***c@gmail.com', cooldownSeconds: 60 });
      const verify = vi.fn().mockRejectedValueOnce(freno(2));
      const adapter: OtpAdapter = { send, verify };
      await act(async () => {
        root.render(<OTPVerification isOpen adapter={adapter} onVerified={vi.fn()} onCancel={vi.fn()} />);
      });
      const casillas = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
      await act(async () => {
        for (let i = 0; i < 6; i++) {
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
          set.call(casillas[i], String(i));
          casillas[i]!.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await act(async () => {
        await Promise.resolve();
      });
      const texto = document.body.textContent ?? '';
      expect(verify).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-testid="otp-bloqueado"]')).not.toBeNull();
      expect(texto).not.toContain('ju***c@gmail.com');
      expect(texto).not.toMatch(/Reenviar/i);
      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(send).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
