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
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

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
