/**
 * «¿Aprendo esto?» debajo de una respuesta (24-09, arquitectura §10.3.4).
 *
 *  1. 🔴 Un no-administrador NO ve el botón (ni siquiera fuera del panel, sin
 *     permisos cargados: falla cerrado).
 *  2. El administrador lo ve sólo donde algo pudo enseñarle al chat: tarjetas,
 *     un «Deshacer», una pregunta que define una palabra.
 *  3. Lo que sale por la red es la ruta y el cuerpo del esquema REAL del micro
 *     (`contrato-del-chat-del-micro.json`), no un espía que repite lo pedido.
 *  4. Todo pasa en el chat: se lee lo que aprendería, se decide ahí mismo.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { erroresContraElEsquema, rutaDelMicro } from '@/lib/api/contrato-del-chat-del-micro';
import { setAccessToken } from '@/lib/api/client';
import type { ChatMessage } from '@/lib/types/beta-chat';

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/components/ui', () => ({ toast: toastMock }));

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';

const chat = vi.hoisted(() => ({ messages: [] as ChatMessage[] }));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => ({
    regenerateResponse: vi.fn(),
    rateMessage: vi.fn(async () => true),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
    messages: chat.messages,
  }),
}));
const permisos = vi.hoisted(() => ({ valor: null as null | { isAdmin: boolean } }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }) }));

import { MessageActions } from './MessageActions';

void React;

let container: HTMLDivElement;
let root: Root;
type Llamada = { url: string; init: RequestInit };
let llamadas: Llamada[];
let respuestas: Array<() => Response>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  permisos.valor = { isAdmin: true };
  chat.messages = [];
  llamadas = [];
  respuestas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      llamadas.push({ url, init });
      const r = respuestas.shift();
      return r ? r() : new Response('{}', { status: 500 });
    }),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function mensaje(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-2',
    role: 'assistant',
    content: 'Encontré dos personas con ese nombre.',
    timestamp: new Date('2026-09-24T15:00:00Z'),
    status: 'complete',
    turnoId: TURNO,
    entidades: [
      { tipo: 'inquilino', id: 'p-1', titulo: 'Juan Camilo López Ruiz' },
      { tipo: 'inquilino', id: 'p-2', titulo: 'Juan Camilo Pérez' },
    ] as ChatMessage['entidades'],
    ...over,
  };
}

function montar(m: ChatMessage) {
  act(() => {
    root.render(React.createElement(MessageActions, { message: m }));
  });
}

const boton = () =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('beta.cerebro.boton')) ?? null;

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('no está el botón');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const jsonOk = (cuerpo: unknown) => () => new Response(JSON.stringify(cuerpo), { status: 200 });

const LECTURA = {
  disponible: true,
  aprendizajes: [
    {
      id: 'lesson-ambiguedad-abc',
      clase: 'leccion',
      origen: 'ambiguedad',
      texto: 'Cuando aquí buscan «juan camilo» salen varias coincidencias; la que buscaban era el inquilino Juan Camilo López Ruiz.',
      estado: 'nuevo',
    },
  ],
  motivo: '',
  leccionesEnUso: false,
};

describe('🔴 quién ve el botón', () => {
  it('un no-administrador NO lo ve, aunque la respuesta traiga tarjetas', () => {
    permisos.valor = { isAdmin: false };
    montar(mensaje());
    expect(boton()).toBeNull();
    expect(container.querySelector('[data-testid="aprender-esto"]')).toBeNull();
  });

  it('sin permisos cargados (fuera del panel) tampoco: falla cerrado', () => {
    permisos.valor = null;
    montar(mensaje());
    expect(boton()).toBeNull();
  });

  it('el administrador lo ve donde algo pudo enseñarle al chat, y no en cualquier respuesta', () => {
    montar(mensaje());
    expect(boton()).not.toBeNull();
    act(() => root.render(React.createElement(MessageActions, { message: mensaje({ entidades: [] }) })));
    expect(boton()).toBeNull();
    act(() => root.render(React.createElement(MessageActions, { message: mensaje({ turnoId: undefined }) })));
    expect(boton()).toBeNull();
  });

  it('también cuando la pregunta definió una palabra («cuando digo giro…»)', () => {
    const respuesta = mensaje({ entidades: [] });
    chat.messages = [
      { id: 'msg-1', role: 'user', content: 'cuando digo giro me refiero al lote de dispersión', timestamp: new Date(), status: 'complete' } as ChatMessage,
      respuesta,
    ];
    montar(respuesta);
    expect(boton()).not.toBeNull();
  });
});

describe('lo que aprende, dentro del chat', () => {
  it('lee lo que aprendería (ruta REAL del micro) y el administrador lo aprende ahí mismo', async () => {
    respuestas.push(jsonOk(LECTURA))
    respuestas.push(jsonOk({ aplicado: true, estado: 'aprendido', motivo: 'Quedó aprendido.', leccionesEnUso: false }));
    montar(mensaje());
    await clic(boton());

    const [lectura] = llamadas;
    expect(lectura!.url).toBe(`http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/aprender/${TURNO}`);
    expect(rutaDelMicro('GET', lectura!.url)?.clave).toBe('GET /api/agency/{agencyId}/ai-hub/chat/aprender/{turnoId}');
    expect(new Headers(lectura!.init.headers).get('Authorization')).toBe('Bearer token-de-prueba');
    expect(container.textContent).toContain('Juan Camilo López Ruiz');
    expect(container.textContent).toContain('beta.cerebro.origen.ambiguedad');

    const aprender = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('beta.cerebro.aprender'));
    await clic(aprender);
    const decision = llamadas[1]!;
    const ruta = rutaDelMicro('POST', decision.url);
    expect(ruta?.clave).toBe('POST /api/agency/{agencyId}/ai-hub/chat/aprender/{turnoId}');
    const cuerpo = JSON.parse(String(decision.init.body));
    expect(cuerpo).toEqual({ id: 'lesson-ambiguedad-abc', decision: 'aprender' });
    expect(erroresContraElEsquema(ruta!.ruta.cuerpo!, cuerpo)).toEqual([]);

    expect(container.textContent).toContain('beta.cerebro.aprendido');
    // El interruptor de uso está apagado: se dice, no se esconde.
    expect(container.querySelector('[data-testid="aprender-sin-uso"]')).not.toBeNull();
    expect(toastMock.success).toHaveBeenCalledWith('beta.cerebro.aprendidoToast');
  });

  it('un «Deshacer»: viaja la propuesta que se deshizo (en la lectura y en la decisión)', async () => {
    respuestas.push(
      jsonOk({ ...LECTURA, aprendizajes: [{ ...LECTURA.aprendizajes[0], id: 'lesson-deshecha-x', origen: 'accion_deshecha' }] }),
    );
    respuestas.push(jsonOk({ aplicado: true, estado: 'descartado', motivo: 'Listo.', leccionesEnUso: true }));
    montar(
      mensaje({
        entidades: [],
        resultado: { propuestaId: 'ficha:p-7', estado: 'deshecha', titulo: 'Deshecho', resumen: 'Deshice el envío.', deshacer: null },
      }),
    );
    await clic(boton());
    expect(llamadas[0]!.url).toBe(`http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/aprender/${TURNO}?propuestaId=ficha%3Ap-7`);
    const no = [...container.querySelectorAll('button')].find((b) => b.textContent === 'beta.cerebro.descartar');
    await clic(no);
    const cuerpo = JSON.parse(String(llamadas[1]!.init.body));
    expect(cuerpo).toEqual({ id: 'lesson-deshecha-x', decision: 'descartar', propuestaId: 'ficha:p-7' });
    const ruta = rutaDelMicro('POST', llamadas[1]!.url)!;
    expect(erroresContraElEsquema(ruta.ruta.cuerpo!, cuerpo)).toEqual([]);
    expect(container.textContent).toContain('beta.cerebro.descartado');
  });

  it('si no hay nada que aprender, lo dice (con el motivo del micro)', async () => {
    respuestas.push(jsonOk({ disponible: true, aprendizajes: [], motivo: 'De esta respuesta todavía no hay nada que aprender.', leccionesEnUso: false }));
    montar(mensaje());
    await clic(boton());
    expect(container.querySelector('[data-testid="aprender-nada"]')?.textContent).toBe(
      'De esta respuesta todavía no hay nada que aprender.',
    );
  });

  it('si el micro no contesta, lo dice y deja reintentar (sin romper el chat)', async () => {
    montar(mensaje());
    await clic(boton());
    expect(container.textContent).toContain('beta.cerebro.error');
    respuestas.push(jsonOk(LECTURA));
    const reintentar = [...container.querySelectorAll('button')].find((b) => b.textContent === 'beta.cerebro.reintentar');
    await clic(reintentar);
    expect(container.textContent).toContain('Juan Camilo López Ruiz');
  });
});
