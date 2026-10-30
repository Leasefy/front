import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const agentFetch = vi.fn();
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetch(...a) }));

import { ChatDelPortal } from './ChatDelPortal';

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

const TARJETA = {
  accion: 'radicar_pqrs',
  titulo: 'Radicar una solicitud',
  detalle: 'Le llega a tu inmobiliaria con lo que escribiste: «se dañó la ducha».',
  boton: 'Sí, hazlo',
  datos: { tipo: 'SOLICITUD', asunto: 'Daño reportado desde el chat del portal', descripcion: 'se dañó la ducha' },
};

void React;
let container: HTMLDivElement;
let root: Root;
const texto = () => document.body.textContent ?? '';
const boton = (nombre: string) =>
  [...document.body.querySelectorAll('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === nombre,
  ) ?? null;
async function hasta<T>(fn: () => T | null | undefined | false): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const r = fn();
    if (r) return r;
    await act(async () => {
      await new Promise((ok) => setTimeout(ok, 10));
    });
  }
  throw new Error('no apareció');
}
async function clic(nombre: string) {
  const b = await hasta(() => boton(nombre));
  await act(async () => {
    b.click();
  });
}
async function escribir(valor: string) {
  const el = document.body.querySelector('textarea[aria-label="Escríbele a Ori"]') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function abrir(portal: 'inquilino' | 'propietario' = 'inquilino') {
  await act(async () => {
    root.render(<ChatDelPortal portal={portal} />);
  });
  await clic('Pregúntale a Ori');
}

describe('ChatDelPortal — Ori dentro del portal, sin modelo', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test/');
    agentFetch.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  it('una sugerencia es un mensaje de la persona: pregunta al micro con su portal y pinta la respuesta', async () => {
    agentFetch.mockResolvedValueOnce(json(200, { pedido: 'cuanto_debo', texto: 'Debes **$ 1.200.000**.', tarjeta: null }));
    await abrir();
    await clic('¿Cuánto debo?');
    await hasta(() => texto().includes('1.200.000'));
    const [url, init] = agentFetch.mock.calls[0];
    expect(url).toBe('http://micro.test/api/portal/chat/pedido');
    expect(JSON.parse(init.body)).toEqual({ texto: '¿Cuánto debo?', portal: 'inquilino' });
  });

  it('la tarjeta no hace nada sin el clic; «Sí, hazlo» manda accion y datos a /hacer y deja el resultado', async () => {
    agentFetch
      .mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }))
      .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, quedó radicada con el radicado PQRS-12.' }));
    await abrir();
    await escribir('se dañó la ducha');
    await clic('Enviar');
    await hasta(() => texto().includes('Te dejo lista la solicitud.'));
    expect(agentFetch).toHaveBeenCalledTimes(1);
    await clic('Sí, hazlo');
    await hasta(() => texto().includes('PQRS-12'));
    const [url, init] = agentFetch.mock.calls[1];
    expect(url).toBe('http://micro.test/api/portal/chat/hacer');
    expect(JSON.parse(init.body)).toEqual({ accion: 'radicar_pqrs', datos: TARJETA.datos });
    expect(boton('Sí, hazlo')).toBeNull();
  });

  it('«Ahora no» cierra la tarjeta sin llamar a nadie', async () => {
    agentFetch.mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }));
    await abrir();
    await escribir('tengo una gotera');
    await clic('Enviar');
    await clic('Ahora no');
    expect(texto()).toContain('No se hizo');
    expect(agentFetch).toHaveBeenCalledTimes(1);
  });

  it('sesión vencida o micro caído: lo dice en palabras, nunca un código', async () => {
    agentFetch.mockResolvedValueOnce(json(401, { error: 'unauthorized', code: 'SESION_NO_VERIFICADA' }));
    await abrir('propietario');
    await clic('¿Cuándo y cuánto me giran?');
    await hasta(() => texto().includes('Tu sesión se venció'));
    agentFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await escribir('¿cuándo me giran?');
    await clic('Enviar');
    await hasta(() => texto().includes('No pude responderte'));
    expect(texto()).not.toMatch(/SESION_NO_VERIFICADA|unauthorized/);
  });
});
