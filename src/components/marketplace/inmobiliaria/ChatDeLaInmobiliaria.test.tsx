/**
 * «Pregúntale a la inmobiliaria» con IA (Nico, 21-10-2026: «necesito que en el
 * marketplace responda pero todo»): responde la IA con sus tarjetas y lo que
 * podría preguntar después; si la IA no responde, el buscador de siempre.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { preguntarAlChat, listar } = vi.hoisted(() => ({ preguntarAlChat: vi.fn(), listar: vi.fn() }));

vi.mock('@/lib/api/marketplace.service', () => ({
  CODIGO_CHAT_SIN_IA: 'CHAT_SIN_IA',
  CODIGO_CHAT_SIN_PREGUNTAS: 'CHAT_SIN_PREGUNTAS',
  marketplaceApi: { preguntarAlChat },
}));
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: { list: listar } }));
vi.mock('@/lib/marketplace/afinar', () => ({ afinarCon: async (b: object, _e: unknown, q: string) => ({ ...b, q }) }));
vi.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: { property: { title: string } }) => <article data-testid="tarjeta">{property.title}</article>,
}));
vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span /> }));
vi.mock('@/components/beta/PensamientoDelTurno', () => ({
  PensamientoDelTurno: ({ pasos }: { pasos: { texto: string }[] }) => (
    <ol data-testid="pasos">{pasos.map((p) => <li key={p.texto}>{p.texto}</li>)}</ol>
  ),
}));
vi.mock('../CajaDelMarketplace', () => ({
  CajaDelMarketplace: ({ onEnviar }: { onEnviar: (t: string) => void }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onEnviar((e.currentTarget.elements.namedItem('q') as HTMLInputElement).value);
      }}
    >
      <input name="q" data-testid="caja" />
      <button type="submit" data-testid="enviar" />
    </form>
  ),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { ApiError } from '@/lib/api/client';
import { ChatDeLaInmobiliaria } from './ChatDeLaInmobiliaria';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  preguntarAlChat.mockReset();
  listar.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function montar(whatsapp: string | null = '573001112233') {
  await act(async () => {
    root.render(
      <ChatDeLaInmobiliaria
        inmobiliaria={{ id: 'agencia-1', nombre: 'Nogal' }}
        sugerencias={['Apartamentos en Laureles']}
        whatsapp={whatsapp}
      />,
    );
  });
}

async function preguntar(texto: string) {
  const caja = container.querySelector('[data-testid="caja"]') as HTMLInputElement;
  caja.value = texto;
  await act(async () => {
    (container.querySelector('[data-testid="enviar"]') as HTMLButtonElement).click();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const LAURELES = { id: 'p-1', title: 'Apartamento en Laureles' };

describe('ChatDeLaInmobiliaria', () => {
  it('responde con la IA: el texto, sus tarjetas, lo que podría preguntar y WhatsApp si hay que hablar con ellos', async () => {
    preguntarAlChat.mockResolvedValueOnce({
      respuesta: 'Sí, el de Laureles acepta mascotas. Lo demás pregúntaselo a la inmobiliaria.',
      inmuebles: [LAURELES],
      sugerencias: ['¿Tiene parqueadero?'],
      contactar: true,
    });
    await montar();
    await preguntar('¿Aceptan mascotas?');

    expect(preguntarAlChat).toHaveBeenCalledWith('agencia-1', { pregunta: '¿Aceptan mascotas?', historial: [] });
    expect(listar).not.toHaveBeenCalled();
    const respuesta = container.querySelector('[data-testid="respuesta-con-ia"]')!;
    expect(respuesta.textContent).toContain('Sí, el de Laureles acepta mascotas.');
    expect([...container.querySelectorAll('[data-testid="tarjeta"]')].map((t) => t.textContent)).toEqual([
      'Apartamento en Laureles',
    ]);
    expect(container.querySelector('[data-testid="chat-sugerencias"]')!.textContent).toContain('¿Tiene parqueadero?');
    const wa = container.querySelector('[data-testid="chat-escribir-por-whatsapp"]') as HTMLAnchorElement;
    expect(wa.href).toContain('https://wa.me/573001112233');
  });

  it('la segunda pregunta lleva la conversación, con los inmuebles que ya mostró', async () => {
    preguntarAlChat
      .mockResolvedValueOnce({ respuesta: 'Tengo este.', inmuebles: [LAURELES], sugerencias: [], contactar: false })
      .mockResolvedValueOnce({ respuesta: 'Tiene un parqueadero.', inmuebles: [], sugerencias: [], contactar: false });
    await montar();
    await preguntar('Busco en Laureles');
    await preguntar('¿Y tiene parqueadero?');

    expect(preguntarAlChat.mock.calls[1][1]).toEqual({
      pregunta: '¿Y tiene parqueadero?',
      historial: [
        { rol: 'persona', texto: 'Busco en Laureles' },
        { rol: 'asistente', texto: 'Tengo este.', inmuebles: ['p-1'] },
      ],
    });
    // Sin «contactar», no ofrece WhatsApp.
    expect(container.querySelector('[data-testid="chat-escribir-por-whatsapp"]')).toBeNull();
  });

  it('si la IA no responde, busca como siempre (el chat nunca se queda callado)', async () => {
    preguntarAlChat.mockRejectedValueOnce(new ApiError(503, 'El chat no puede responder.', 'CHAT_SIN_IA'));
    listar.mockResolvedValueOnce({ data: [LAURELES], meta: { total: 1 } });
    await montar();
    await preguntar('apartamento en laureles');

    expect(listar).toHaveBeenCalled();
    expect(container.textContent).toContain('que cumple lo que pides');
    expect(container.querySelectorAll('[data-testid="tarjeta"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="respuesta-con-ia"]')).toBeNull();
  });

  it('tras dos fallas seguidas deja de preguntarle a la IA en esta pestaña', async () => {
    preguntarAlChat.mockRejectedValue(new ApiError(503, 'sin IA', 'CHAT_SIN_IA'));
    listar.mockResolvedValue({ data: [], meta: { total: 0 } });
    await montar(null);
    await preguntar('uno');
    await preguntar('dos');
    await preguntar('tres');
    expect(preguntarAlChat).toHaveBeenCalledTimes(2);
    expect(listar.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('con el cupo con IA agotado lo dice una vez y sigue como buscador sin volver a preguntarle', async () => {
    preguntarAlChat.mockRejectedValueOnce(
      new ApiError(429, 'Ya usaste tus preguntas con IA de hoy. Sigo buscando por ti en los inmuebles publicados.', 'CHAT_SIN_PREGUNTAS'),
    );
    listar.mockResolvedValue({ data: [LAURELES], meta: { total: 1 } });
    await montar();
    await preguntar('¿y con balcón?');
    expect(container.querySelector('[data-testid="chat-sin-preguntas"]')!.textContent).toContain('Ya usaste tus preguntas con IA');
    expect(listar).toHaveBeenCalled();
    await preguntar('otra más');
    expect(preguntarAlChat).toHaveBeenCalledTimes(1);
  });
});
