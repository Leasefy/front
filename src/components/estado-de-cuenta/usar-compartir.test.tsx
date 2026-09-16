/**
 * Las tres formas de distribuir el estado de cuenta.
 *
 * Lo que se protege: que el enlace se pida UNA vez (cada POST abre otra puerta
 * a la misma información), que al copiarlo se diga cuándo vence, que sin
 * portapapeles quede una salida en vez de un error a secas, y que cuando el
 * back dice POR QUÉ no salió el envío —no aceptó WhatsApp, no tiene correo— se
 * muestre ESE motivo y no uno genérico.
 *
 * 🔴 La regla de si SE PUEDE mandar vive en el back, no acá: él sabe si hay
 * correo, cuenta del portal, teléfono y consentimiento. Estas pruebas fijan que
 * el front no la duplique ni la tape.
 *
 * Auditoría de casos de error 13-09: E2 (el envío se confirma antes de salir),
 * E3 (un enlace revocado no se vuelve a copiar) y E5 (cada fallo dice lo suyo).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const compartir = vi.fn();
const enviar = vi.fn();
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: {
    compartir: (...a: unknown[]) => compartir(...a),
    enviar: (...a: unknown[]) => enviar(...a),
  },
}));

const exito = vi.fn();
const error = vi.fn();
const info = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => exito(...a),
    error: (...a: unknown[]) => error(...a),
    info: (...a: unknown[]) => info(...a),
  },
}));

import { useCompartirEstado } from './usar-compartir';

const ENLACE = { url: 'https://app.leasefy.co/estado-de-cuenta/abc', venceEl: '2026-10-13' };

let host: HTMLDivElement;
let root: Root;

/** Un arnés con botones llanos: la regla se prueba sin el menú de Radix. */
function Arnes() {
  const c = useCompartirEstado({ tipo: 'inquilino', id: 'tenant-1' });
  return (
    <>
      <button data-testid="enlace" onClick={() => void c.copiarEnlace()} />
      <button data-testid="correo" onClick={() => void c.enviarPorCorreo()} />
      <button data-testid="whatsapp" onClick={() => void c.enviarPorWhatsapp()} />
      <button data-testid="pedir-correo" onClick={() => c.pedirEnvio('CORREO')} />
      <button data-testid="confirmar" onClick={() => void c.confirmarEnvio()} />
      <button data-testid="cancelar" onClick={() => c.cancelarEnvio()} />
      <button data-testid="olvidar-e-1" onClick={() => c.olvidarEnlace('e-1')} />
      <span data-testid="por-confirmar">{c.envioPorConfirmar ?? ''}</span>
    </>
  );
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<Arnes />);
  });
}

async function apretar(testid: string) {
  const b = host.querySelector(`[data-testid="${testid}"]`);
  if (!b) throw new Error(`no encontré ${testid}`);
  await act(async () => {
    (b as HTMLElement).click();
  });
}

function conPortapapeles(escribir: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(escribir) },
    configurable: true,
  });
}

beforeEach(() => {
  compartir.mockResolvedValue(ENLACE);
  enviar.mockResolvedValue({
    enviado: true,
    destino: 'papas@jyc.co',
    canal: 'CORREO',
    enlace: ENLACE,
  });
  conPortapapeles(async () => {});
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('useCompartirEstado', () => {
  it('copiar el enlace dice cuándo vence', async () => {
    await montar();
    await apretar('enlace');

    expect(compartir).toHaveBeenCalledWith('inquilino', 'tenant-1');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(ENLACE.url);
    expect(String(exito.mock.calls[0]![1]?.description)).toContain('13 oct 2026');
  });

  it('sin portapapeles muestra el enlace para copiarlo a mano, no un error a secas', async () => {
    conPortapapeles(async () => {
      throw new Error('contexto inseguro');
    });
    await montar();
    await apretar('enlace');

    expect(info).toHaveBeenCalled();
    expect(String(info.mock.calls[0]![1]?.description)).toBe(ENLACE.url);
    expect(error).not.toHaveBeenCalled();
  });

  it('el enlace se pide UNA vez: cada POST es otra puerta abierta a lo mismo', async () => {
    await montar();
    await apretar('enlace');
    await apretar('enlace');
    expect(compartir).toHaveBeenCalledTimes(1);
  });

  it('el correo va por el endpoint de envío y confirma a dónde llegó', async () => {
    await montar();
    await apretar('correo');

    expect(enviar).toHaveBeenCalledWith('inquilino', 'tenant-1', 'CORREO');
    expect(String(exito.mock.calls[0]![0])).toContain('papas@jyc.co');
  });

  it('WhatsApp usa el MISMO endpoint con su canal: el back es el que sabe si se puede', async () => {
    enviar.mockResolvedValue({
      enviado: true,
      destino: '+57 310 ••• 0479',
      canal: 'WHATSAPP',
      enlace: ENLACE,
    });
    await montar();
    await apretar('whatsapp');

    expect(enviar).toHaveBeenCalledWith('inquilino', 'tenant-1', 'WHATSAPP');
    expect(String(exito.mock.calls[0]![0])).toContain('+57 310');
  });

  it('🔴 si el cliente no aceptó WhatsApp, se muestra ESE motivo y no uno genérico', async () => {
    enviar.mockResolvedValue({
      enviado: false,
      destino: '',
      canal: 'WHATSAPP',
      enlace: ENLACE,
      motivo: 'El cliente no aceptó recibir mensajes por WhatsApp. El enlace queda creado.',
    });
    await montar();
    await apretar('whatsapp');

    expect(exito).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'El cliente no aceptó recibir mensajes por WhatsApp. El enlace queda creado.',
    );
  });

  it('un envío fallido igual deja el enlace listo: copiarlo después no emite otro', async () => {
    enviar.mockResolvedValue({
      enviado: false,
      destino: '',
      canal: 'CORREO',
      enlace: ENLACE,
      motivo: 'El cliente no tiene correo registrado.',
    });
    await montar();
    await apretar('correo');
    await apretar('enlace');

    expect(compartir).not.toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(ENLACE.url);
  });

  it('si el envío revienta, lo dice en vez de callarse', async () => {
    enviar.mockRejectedValue(new Error('500'));
    await montar();
    await apretar('correo');

    expect(error).toHaveBeenCalled();
  });
});

describe('E2 — un envío real se confirma antes de salir', () => {
  it('🔴 pedir el envío NO manda nada: queda esperando confirmación', async () => {
    await montar();
    await apretar('pedir-correo');

    expect(enviar).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="por-confirmar"]')!.textContent).toBe('CORREO');
  });

  it('confirmar manda por el canal pedido y cierra la espera', async () => {
    await montar();
    await apretar('pedir-correo');
    await apretar('confirmar');

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledWith('inquilino', 'tenant-1', 'CORREO');
    expect(host.querySelector('[data-testid="por-confirmar"]')!.textContent).toBe('');
  });

  it('cancelar no manda', async () => {
    await montar();
    await apretar('pedir-correo');
    await apretar('cancelar');
    await apretar('confirmar');

    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('E5 — cada fallo dice lo suyo', () => {
  it('🔴 un 403 dice que el rol no puede compartirlo, no «no se pudo»', async () => {
    enviar.mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    await montar();
    await apretar('correo');

    expect(String(error.mock.calls[0]![0])).toContain('Tu rol no puede compartir');
    expect(String(error.mock.calls[0]![0])).not.toContain('Forbidden');
  });

  it('sin red dice que no hubo conexión y que no se pudo confirmar', async () => {
    enviar.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();
    await apretar('correo');

    expect(String(error.mock.calls[0]![0])).toContain('No hubo conexión');
  });

  it('un 4xx del back trae su propio motivo en castellano, y ése gana', async () => {
    enviar.mockRejectedValue(new ApiError(404, 'Ese cliente no tiene contratos en la inmobiliaria.'));
    await montar();
    await apretar('whatsapp');

    expect(error).toHaveBeenCalledWith('Ese cliente no tiene contratos en la inmobiliaria.');
  });

  it('copiar el enlace con un 403 también lo dice', async () => {
    compartir.mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    await montar();
    await apretar('enlace');

    expect(String(error.mock.calls[0]![0])).toContain('Tu rol no puede compartir');
  });
});

describe('E3 — un enlace revocado no se vuelve a copiar', () => {
  it('🔴 tras revocarlo, «Copiar enlace» pide uno nuevo en vez de dar el viejo', async () => {
    compartir.mockResolvedValueOnce({ ...ENLACE, id: 'e-1' }).mockResolvedValueOnce({
      url: 'https://app.leasefy.co/estado-de-cuenta/nuevo',
      venceEl: '2026-10-14',
      id: 'e-2',
    });
    await montar();
    await apretar('enlace');
    await apretar('olvidar-e-1');
    await apretar('enlace');

    expect(compartir).toHaveBeenCalledTimes(2);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      'https://app.leasefy.co/estado-de-cuenta/nuevo',
    );
  });
});
