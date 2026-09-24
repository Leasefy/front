/**
 * El chat y el cerebro del micro (23-09), de punta a punta y por la red de
 * verdad (el `fetch` es falso; el stream, su lectura y los clientes, reales):
 *
 *  1. El `turnoId` que el servidor acuña llega al mensaje del asistente, por
 *     el `done` del stream y por el POST de respaldo.
 *  2. El 👍/👎 (y su comentario) viajan con ESE turno, en la llave que la ruta
 *     del micro de verdad lee (`turnId`), comparado contra su esquema real.
 *  3. Abrir una tarjeta manda la señal con ese turno, con el cuerpo del
 *     esquema real.
 *  4. Un 500 o una red caída en las señales no tocan el chat.
 *  5. El abandono: irse sin mirar la respuesta, o con el turno sin terminar,
 *     sale una vez; si el turno se usó, no sale.
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }),
}));

import { useBetaChat } from './useBetaChat';
import { setAccessToken } from '@/lib/api/client';
import { erroresContraElEsquema, rutaDelMicro } from '@/lib/api/contrato-del-chat-del-micro';
import { __olvidarSenalesParaPruebas } from '@/lib/chat/senales';
import type { ChatMessage } from '@/lib/types/beta-chat';

const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
const OTRO_TURNO = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

type Llamada = { url: string; init: RequestInit; cuerpo: Record<string, unknown> | null };
let llamadas: Llamada[];
/** Qué contesta el micro a cada ruta; cada prueba lo ajusta. */
let micro: {
  stream: (n: number) => Response;
  post: () => Response;
  senales: () => Promise<Response>;
};
let turnosPedidos = 0;

function sse(eventos: Array<[string, unknown]>): Response {
  const texto = eventos.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  return new Response(texto, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

/** Un turno completo del micro por el stream, con su `turnoId` en el `done`. */
function turnoDelMicro(texto: string, turnoId: string, extra: Record<string, unknown> = {}): Response {
  return sse([
    ['message', { type: 'message', responseText: texto, suggestedActions: [] }],
    [
      'done',
      {
        responseText: texto,
        suggestedActions: [],
        dispatches: [],
        pendingApprovals: [],
        accionesPropuestas: [],
        entidades: [],
        turnoId,
        bloques: [],
        generatedAt: new Date().toISOString(),
        ...extra,
      },
    ],
  ]);
}

let visibilidad: 'visible' | 'hidden' = 'visible';

beforeEach(() => {
  localStorage.clear();
  // La espera antes de mandar (con la página viva) se acorta a 50 ms.
  __olvidarSenalesParaPruebas(50);
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  llamadas = [];
  turnosPedidos = 0;
  visibilidad = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilidad });
  micro = {
    stream: () => turnoDelMicro('Juan Camilo López está al día.', TURNO),
    post: () => json(500, { error: 'sin respaldo en esta prueba' }),
    senales: async () => json(200, { registrada: true, motivo: 'Anotado.' }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      let cuerpo: Record<string, unknown> | null = null;
      try {
        cuerpo = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      } catch {
        cuerpo = null;
      }
      llamadas.push({ url, init, cuerpo });
      const camino = new URL(url).pathname;
      if (camino.endsWith('/ai-hub/chat/stream')) return micro.stream(turnosPedidos++);
      if (camino.endsWith('/ai-hub/chat/senales')) return micro.senales();
      if (camino.endsWith('/ai-hub/chat/feedback')) {
        return json(200, { guardado: true, yaRegistrado: false, leccionId: null, motivo: '', registradoEn: '' });
      }
      if (camino.endsWith('/ai-hub/chat')) return micro.post();
      return json(404, { error: 'no existe' });
    }),
  );
});

afterEach(() => {
  __olvidarSenalesParaPruebas();
  vi.unstubAllGlobals();
  setAccessToken(null);
  delete (document as unknown as Record<string, unknown>).visibilityState;
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
  act(() => {
    root.render(<Sonda />);
  });
  let suelto = false;
  return {
    get actual() {
      return ref.current!;
    },
    soltar() {
      if (suelto) return;
      suelto = true;
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

async function esperarA(cond: () => boolean, ms = 6000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

function ultimoAsistente(s: ReturnType<typeof montar>): ChatMessage | undefined {
  return [...s.actual.messages].reverse().find((m) => m.role === 'assistant');
}

const senales = () => llamadas.filter((l) => l.url.endsWith('/ai-hub/chat/senales'));
const abandonos = () => senales().filter((l) => l.cuerpo?.tipo === 'abandono');
const pausa = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

/** Pregunta y espera a que la respuesta termine de mostrarse. */
async function preguntar(s: ReturnType<typeof montar>, texto: string) {
  act(() => {
    s.actual.sendMessage(texto);
  });
  await esperarA(() => ultimoAsistente(s)?.status === 'complete' && !s.actual.isStreaming, 10_000);
}

describe('el turnoId del servidor queda en el mensaje del asistente', () => {
  it('por el `done` del stream', async () => {
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    expect(ultimoAsistente(s)?.turnoId).toBe(TURNO);
    // Sin `reintentable` en el `done`, nada de «Reintentar».
    expect(ultimoAsistente(s)?.reintentable).toBeUndefined();
    s.soltar();
  });

  it('por la respuesta del POST cuando el stream se cae', async () => {
    micro.stream = () => json(500, { error: 'stream caído' });
    micro.post = () =>
      json(200, {
        responseText: 'Juan Camilo López está al día.',
        suggestedActions: [],
        dispatches: [],
        pendingApprovals: [],
        accionesPropuestas: [],
        entidades: [],
        turnoId: OTRO_TURNO,
        snapshot: null,
        generatedAt: new Date().toISOString(),
      });
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    expect(ultimoAsistente(s)?.turnoId).toBe(OTRO_TURNO);
    s.soltar();
  });
});

describe('el 👍/👎 viaja con el turno, en la llave que el micro de verdad lee', () => {
  it('pulgar arriba, y pulgar abajo con comentario: `turnId` = el turnoId, cuerpo del esquema real', async () => {
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    const id = ultimoAsistente(s)!.id;

    await act(async () => {
      await s.actual.rateMessage(id, 'up');
    });
    await act(async () => {
      await s.actual.rateMessage(id, 'down', { comentario: 'Era el contrato #1291', cifraMal: true });
    });

    const pulgares = llamadas.filter((l) => l.url.endsWith('/ai-hub/chat/feedback'));
    expect(pulgares).toHaveLength(2);
    for (const p of pulgares) {
      const r = rutaDelMicro(String(p.init.method), p.url);
      expect(r?.clave).toBe('POST /api/agency/{agencyId}/ai-hub/chat/feedback');
      expect(erroresContraElEsquema(r!.ruta.cuerpo!, p.cuerpo)).toEqual([]);
      expect(p.cuerpo!.turnId).toBe(TURNO);
    }
    expect(pulgares[1].cuerpo).toMatchObject({ veredicto: 'down', comentario: 'Era el contrato #1291', cifraMal: true });
    s.soltar();
  });
});

describe('abrir una tarjeta', () => {
  it('manda `tarjeta_abierta` con el turno y la entidad, según el esquema real', async () => {
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    act(() => {
      s.actual.anotarTarjetaAbierta(ultimoAsistente(s)!.turnoId, { tipo: 'inquilino', id: 'per_1291' });
    });
    expect(senales()).toHaveLength(1);
    const [l] = senales();
    expect(l.url).toBe(`http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/senales`);
    const r = rutaDelMicro(String(l.init.method), l.url);
    expect(r?.clave).toBe('POST /api/agency/{agencyId}/ai-hub/chat/senales');
    expect(erroresContraElEsquema(r!.ruta.cuerpo!, l.cuerpo)).toEqual([]);
    expect(l.cuerpo).toEqual({ turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: { tipo: 'inquilino', id: 'per_1291' } });
    s.soltar();
  });

  it('un mensaje sin turnoId (de antes, o de un micro viejo) no manda nada', async () => {
    const s = montar();
    act(() => {
      s.actual.anotarTarjetaAbierta(undefined, { tipo: 'inquilino', id: 'per_1291' });
    });
    expect(senales()).toHaveLength(0);
    s.soltar();
  });
});

describe('un fallo al mandar una señal no toca el chat', () => {
  it.each([
    ['un 500', async () => json(500, { error: 'boom' })],
    ['una red caída', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('%s: la señal se pierde y la siguiente pregunta se contesta igual', async (_n, fallo) => {
    micro.senales = fallo as () => Promise<Response>;
    micro.stream = (n) =>
      n === 0
        ? turnoDelMicro('Juan Camilo López está al día.', TURNO)
        : turnoDelMicro('Su contrato es el #1291.', OTRO_TURNO);
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    act(() => {
      s.actual.anotarTarjetaAbierta(TURNO, { tipo: 'inquilino', id: 'per_1291' });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    await preguntar(s, '¿y cuál es su contrato?');
    const ultimo = ultimoAsistente(s)!;
    expect(ultimo.status).toBe('complete');
    expect(ultimo.content).toBe('Su contrato es el #1291.');
    expect(ultimo.turnoId).toBe(OTRO_TURNO);
    expect(s.actual.isThinking).toBe(false);
    // Y no se reintentó: una sola señal, aunque falló.
    expect(senales()).toHaveLength(1);
    s.soltar();
  });
});

describe('el abandono', () => {
  it('llegó con la pestaña oculta y se fue a otra conversación sin mirarla: sale una vez', async () => {
    visibilidad = 'hidden';
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    act(() => {
      s.actual.createConversation();
    });
    // Con la página viva no sale enseguida: le da tiempo al micro de anotar el turno.
    expect(abandonos()).toHaveLength(0);
    await esperarA(() => abandonos().length === 1);
    // Salir del chat después no la vuelve a mandar.
    s.soltar();
    await pausa(120);
    expect(abandonos()).toHaveLength(1);
    expect(abandonos()[0].cuerpo).toEqual({ turnoId: TURNO, tipo: 'abandono' });
    expect(abandonos()[0].init.keepalive).toBe(true);
  });

  it('cerrar la pestaña (pagehide) con la respuesta sin mirar también cuenta', async () => {
    visibilidad = 'hidden';
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(senales().map((l) => l.cuerpo)).toEqual([{ turnoId: TURNO, tipo: 'abandono' }]);
    s.soltar();
  });

  it('irse con la respuesta todavía mostrándose es un turno sin terminar', async () => {
    micro.stream = () => turnoDelMicro('Juan Camilo López está al día. '.repeat(40), TURNO);
    const s = montar();
    act(() => {
      s.actual.sendMessage('busca a Juan Camilo López');
    });
    await esperarA(() => ultimoAsistente(s)?.turnoId === TURNO);
    expect(ultimoAsistente(s)?.status).not.toBe('complete');
    act(() => {
      s.actual.createConversation();
    });
    await esperarA(() => senales().length > 0);
    expect(senales().map((l) => l.cuerpo)).toEqual([{ turnoId: TURNO, tipo: 'abandono' }]);
    s.soltar();
  });

  it.each([
    [
      'la valoró',
      async (s: ReturnType<typeof montar>) => {
        await s.actual.rateMessage(ultimoAsistente(s)!.id, 'up');
      },
    ],
    [
      'abrió una tarjeta',
      async (s: ReturnType<typeof montar>) => {
        s.actual.anotarTarjetaAbierta(ultimoAsistente(s)!.turnoId, { tipo: 'inquilino', id: 'per_1291' });
      },
    ],
  ])('si %s, irse no es abandono', async (_n, usarla) => {
    visibilidad = 'hidden';
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    await act(async () => {
      await usarla(s);
    });
    act(() => {
      s.actual.createConversation();
    });
    s.soltar();
    await pausa(150);
    expect(abandonos()).toHaveLength(0);
  });

  it('una respuesta que se miró y se dejó ahí no es abandono', async () => {
    const s = montar();
    await preguntar(s, 'busca a Juan Camilo López');
    // Más que la mirada mínima, con la pestaña a la vista.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2100));
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    s.soltar();
    await pausa(150);
    expect(senales()).toHaveLength(0);
  });
});

describe('Reintentar (el micro avisa con `reintentable` en el `done`)', () => {
  it('queda en el mensaje; reintentar manda la MISMA pregunta y cuenta la respuesta descartada', async () => {
    const PREGUNTA = 'busca a Juan Camilo López';
    micro.stream = (n) =>
      n === 0
        ? turnoDelMicro('No pude hacer la búsqueda en este momento. Intenta de nuevo en un momento.', TURNO, {
            reintentable: { motivo: 'tiempo', que: 'busqueda' },
          })
        : turnoDelMicro('Juan Camilo López está al día.', OTRO_TURNO);
    const s = montar();
    await preguntar(s, PREGUNTA);
    const fallida = ultimoAsistente(s)!;
    expect(fallida.reintentable).toEqual({ motivo: 'tiempo', que: 'busqueda' });

    act(() => {
      s.actual.regenerateResponse(fallida.id);
    });
    await esperarA(
      () => ultimoAsistente(s)?.turnoId === OTRO_TURNO && ultimoAsistente(s)?.status === 'complete' && !s.actual.isStreaming,
      10_000,
    );

    const pedidos = llamadas.filter((l) => l.url.endsWith('/ai-hub/chat/stream'));
    expect(pedidos.map((p) => p.cuerpo?.message)).toEqual([PREGUNTA, PREGUNTA]);
    // La respuesta fallida se reemplazó (no quedan dos) y la nueva no trae el botón.
    expect(s.actual.messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
    expect(ultimoAsistente(s)!.reintentable).toBeUndefined();
    // La señal del reintento: el tipo más cercano que la ruta acepta, con el
    // turno de la respuesta descartada, según el esquema real.
    await esperarA(() => senales().length > 0);
    await pausa(120);
    expect(senales()).toHaveLength(1);
    const [l] = senales();
    expect(l.cuerpo).toEqual({ turnoId: TURNO, tipo: 'abandono' });
    const r = rutaDelMicro(String(l.init.method), l.url);
    expect(erroresContraElEsquema(r!.ruta.cuerpo!, l.cuerpo)).toEqual([]);
    s.soltar();
  });
});
