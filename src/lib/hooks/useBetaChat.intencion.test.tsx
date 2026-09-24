/**
 * «Todo en el chat» (Nico, 23-09), de punta a punta por la red de verdad (el
 * `fetch` es falso; el stream, su lectura y el hook, reales):
 *
 *  1. Un botón del hilo es un mensaje de la persona: el texto aparece en el
 *     hilo y la INTENCIÓN viaja en el cuerpo del stream, tal cual.
 *  2. Lo que actúa en el hilo (acciones, «¿Lo hago?», resultado, formulario)
 *     llega en el `done` y queda en el mensaje del asistente.
 *  3. «Sí, hazlo» es otro mensaje con su intención; «Rehacer» vuelve a pedir
 *     lo mismo (con la intención), no el texto suelto.
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }),
}));

import { useBetaChat } from './useBetaChat';
import { setAccessToken } from '@/lib/api/client';
import { __olvidarSenalesParaPruebas } from '@/lib/chat/senales';
import type { ChatMessage } from '@/lib/types/beta-chat';

const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
const PROPUESTA = '6a3540bf-5627-49b4-bad0-6c56c1eacf8c';
const CONTRATO = { tipo: 'contrato', id: '4a23f784-2050-4874-bfc4-bc9d1352794a' };

let cuerpos: Array<Record<string, unknown>>;
let respuestas: Array<Record<string, unknown>>;

function sse(done: Record<string, unknown>): Response {
  const eventos: Array<[string, unknown]> = [
    ['message', { type: 'message', responseText: done.responseText, suggestedActions: [] }],
    ['done', { suggestedActions: [], dispatches: [], pendingApprovals: [], entidades: [], bloques: [], turnoId: TURNO, ...done }],
  ];
  return new Response(eventos.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(''), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

beforeEach(() => {
  localStorage.clear();
  __olvidarSenalesParaPruebas(50);
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  cuerpos = [];
  respuestas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (new URL(url).pathname.endsWith('/ai-hub/chat/stream')) {
        cuerpos.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return sse(respuestas.shift() ?? { responseText: 'ok' });
      }
      return new Response('{}', { status: 200 });
    }),
  );
});

afterEach(() => {
  __olvidarSenalesParaPruebas();
  vi.unstubAllGlobals();
  setAccessToken(null);
});

function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root: Root = createRoot(contenedor);
  const ref: { current: ReturnType<typeof useBetaChat> | null } = { current: null };
  function Sonda() {
    ref.current = useBetaChat();
    return null;
  }
  act(() => root.render(<Sonda />));
  return {
    get actual() {
      return ref.current!;
    },
    soltar() {
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

async function esperarA(cond: () => boolean, ms = 8000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

const ultimo = (s: ReturnType<typeof montar>, rol: 'user' | 'assistant'): ChatMessage | undefined =>
  [...s.actual.messages].reverse().find((m) => m.role === rol);

async function mandar(s: ReturnType<typeof montar>, texto: string, intencion?: Record<string, unknown>) {
  act(() => s.actual.sendMessage(texto, intencion ? { intencion: intencion as never } : undefined));
  await esperarA(() => ultimo(s, 'assistant')?.status === 'complete' && !s.actual.isStreaming);
}

describe('un botón del hilo es un mensaje de la persona con su intención', () => {
  it('el texto queda en el hilo y la intención viaja en el cuerpo del stream', async () => {
    const s = montar();
    const intencion = { accion: 'ver', entidad: { tipo: 'contrato', id: '24' } };
    await mandar(s, 'Ver contrato 24', intencion);
    expect(ultimo(s, 'user')).toMatchObject({ content: 'Ver contrato 24', intencion });
    expect(cuerpos[0]).toMatchObject({ message: 'Ver contrato 24', intencion });
    s.soltar();
  });

  it('un mensaje escrito a mano no lleva intención', async () => {
    const s = montar();
    await mandar(s, '¿cómo va la cartera?');
    expect('intencion' in cuerpos[0]).toBe(false);
    s.soltar();
  });

  it('las acciones y la tarjeta de «¿Lo hago?» del `done` quedan en el mensaje del asistente', async () => {
    respuestas.push({
      responseText: 'Le escribe a otra persona: siempre te lo pregunto antes.',
      acciones: [
        {
          id: 'ver_estado_de_cuenta',
          titulo: 'Ver el estado de cuenta',
          entidad: CONTRATO,
          disponible: true,
          porQueNo: null,
          riesgo: { muevePlata: false, escribeATerceros: false, irreversible: false },
          lectura: true,
        },
      ],
      confirmacion: {
        propuestaId: PROPUESTA,
        accion: 'mandar_estado_de_cuenta_por_correo',
        titulo: 'Mandarle el estado de cuenta por correo',
        frase: 'Voy a mandarle el estado de cuenta…',
        pregunta: '¿Lo hago?',
        porQue: 'Le escribe a otra persona.',
        modo: 'automatico',
        riesgo: { muevePlata: false, escribeATerceros: true, irreversible: false },
        venceEn: new Date(Date.now() + 600_000).toISOString(),
      },
    });
    respuestas.push({
      responseText: 'Listo.',
      resultado: { propuestaId: PROPUESTA, estado: 'hecha', titulo: 'Mandarle el estado de cuenta', resumen: 'Le mandé el estado de cuenta.', deshacer: null },
    });
    const s = montar();
    await mandar(s, 'Mandarle el estado de cuenta por correo', { accion: 'mandar_estado_de_cuenta_por_correo', entidad: CONTRATO });
    const a = ultimo(s, 'assistant')!;
    expect(a.acciones?.[0]).toMatchObject({ id: 'ver_estado_de_cuenta', lectura: true });
    expect(a.confirmacion).toMatchObject({ propuestaId: PROPUESTA, modo: 'automatico' });

    await mandar(s, 'Sí, hazlo', { accion: 'confirmar', propuestaId: PROPUESTA });
    expect(cuerpos[1]).toMatchObject({ message: 'Sí, hazlo', intencion: { accion: 'confirmar', propuestaId: PROPUESTA } });
    expect(ultimo(s, 'assistant')!.resultado).toMatchObject({ estado: 'hecha' });
    s.soltar();
  });

  it('«Rehacer» vuelve a pedir lo mismo CON la intención (la ficha, no el texto del botón)', async () => {
    const s = montar();
    const intencion = { accion: 'ver', entidad: { tipo: 'contrato', id: '24' } };
    await mandar(s, 'Ver contrato 24', intencion);
    act(() => s.actual.regenerateResponse(ultimo(s, 'assistant')!.id));
    await esperarA(() => cuerpos.length === 2 && ultimo(s, 'assistant')?.status === 'complete' && !s.actual.isStreaming);
    expect(cuerpos[1]).toMatchObject({ message: 'Ver contrato 24', intencion });
    s.soltar();
  });
});
