/**
 * El turno del chat, por donde de verdad duele:
 *
 *  1. El texto se MUESTRA cuando llega el evento `message`, no al `done`.
 *     Medido en vivo: el micro manda la respuesta completa en `message` y el
 *     front la escondía hasta el cierre del stream → 25 s de pantalla muerta y
 *     después el texto de golpe.
 *  2. Cambiar de conversación ABORTA el turno en vuelo. Antes el `fetch`
 *     seguía y sus handlers volvían a prender `isStreaming`/`isAgentsRunning`:
 *     la conversación nueva quedaba con el compositor bloqueado.
 *  3. El historial ya NO se borra cada día natural.
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: 'ag-1' } }),
}));

const streamChatTurn = vi.fn();
const postChatTurn = vi.fn();

vi.mock('@/lib/api/ai-hub-chat', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/ai-hub-chat')>(
    '@/lib/api/ai-hub-chat',
  );
  return {
    ...real,
    isAgentConfigured: () => true,
    streamChatTurn: (...a: unknown[]) => streamChatTurn(...a),
    postChatTurn: (...a: unknown[]) => postChatTurn(...a),
  };
});

import {
  aprobacionADecision,
  mensajeDeFalloDelChat,
  podarConversacionesViejas,
  useBetaChat,
} from './useBetaChat';
import { ApiError } from '@/lib/api/client';
import type { BackendPendingApproval } from '@/lib/api/ai-hub-chat';
import type { Conversation } from '@/lib/types/beta-chat';

beforeEach(() => {
  localStorage.clear();
  streamChatTurn.mockReset();
  postChatTurn.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Monta el hook y deja leer su valor actual (el repo no usa @testing-library). */
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

/** Espera (bombeando el reloj de React) hasta que la condición se cumpla. */
async function esperarA(cond: () => boolean, ms = 4000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

/** Texto visible del asistente: el del mensaje o el que se está tecleando. */
function textoDelAsistente(s: ReturnType<typeof montar>): string {
  const m = [...s.actual.messages].reverse().find((x) => x.role === 'assistant');
  return m?.content || s.actual.streamingContent || '';
}

describe('el texto se ve cuando llega `message`, no al `done`', () => {
  it('con el stream abierto (sin `done` todavía) la respuesta ya está a la vista', async () => {
    // El stream emite `message` y se queda colgado: es el escenario real —
    // entre `message` y `done` corre el especialista, decenas de segundos.
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => {
      soltar = r;
    });
    streamChatTurn.mockImplementation(async (args: { handlers: Record<string, unknown> }) => {
      const h = args.handlers as {
        onMessage: (t: string, a: unknown[]) => void;
      };
      h.onMessage('Tienes 10 inmuebles arrendados y 2 disponibles.', []);
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿cuántos inmuebles tengo?');
    });

    await esperarA(() => textoDelAsistente(s).includes('Tienes 10 inmuebles'));
    // El `done` nunca llegó: si el texto se ve, se vio al `message`.
    expect(textoDelAsistente(s)).toContain('Tienes 10 inmuebles');
    soltar();
    s.soltar();
  });

  it('el `done` reconcilia el mismo texto sin reiniciarlo y cierra el turno', async () => {
    streamChatTurn.mockImplementation(async (args: { handlers: Record<string, unknown> }) => {
      const h = args.handlers as {
        onMessage: (t: string, a: unknown[]) => void;
        onDone: (f: unknown) => void;
      };
      h.onMessage('Respuesta final del asistente.', []);
      h.onDone({
        responseText: 'Respuesta final del asistente.',
        suggestedActions: [],
        dispatches: [],
      });
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('hola');
    });

    await esperarA(() => textoDelAsistente(s).includes('Respuesta final'));
    await esperarA(() => s.actual.isStreaming === false, 8000);
    expect(textoDelAsistente(s)).toBe('Respuesta final del asistente.');
    expect(s.actual.isThinking).toBe(false);
    s.soltar();
  });
});

describe('cambiar de conversación aborta el turno en vuelo', () => {
  it('aborta el fetch y deja la UI desbloqueada, sin cartel de error', async () => {
    let señal: AbortSignal | undefined;
    streamChatTurn.mockImplementation(
      async (args: { signal?: AbortSignal; handlers: Record<string, unknown> }) => {
        señal = args.signal;
        const h = args.handlers as { onMessage: (t: string, a: unknown[]) => void };
        h.onMessage('Voy a mitad de camino…', []);
        await new Promise<void>((resolve) => {
          args.signal?.addEventListener('abort', () => resolve());
        });
        throw new DOMException('Aborted', 'AbortError');
      },
    );

    const s = montar();
    act(() => {
      s.actual.sendMessage('pregunta larga');
    });
    await esperarA(() => señal !== undefined);

    act(() => {
      s.actual.createConversation();
    });
    await esperarA(() => señal!.aborted === true);

    // La conversación NUEVA no puede quedar con el compositor bloqueado.
    await esperarA(() => s.actual.isStreaming === false);
    expect(s.actual.isAgentsRunning).toBe(false);
    expect(s.actual.isThinking).toBe(false);
    // Y abortar es intencional: ni respaldo POST ni mensaje de error.
    expect(postChatTurn).not.toHaveBeenCalled();
    expect(s.actual.messages).toHaveLength(0);
    s.soltar();
  });
});

describe('el historial ya no se borra cada día', () => {
  it('poda por antigüedad (30 días) en vez de vaciar al cambiar de fecha', () => {
    const ahora = new Date('2026-09-05T12:00:00Z');
    const conv = (id: string, dias: number): Conversation =>
      ({
        id,
        title: id,
        messages: [],
        createdAt: new Date(ahora.getTime() - dias * 86_400_000),
        updatedAt: new Date(ahora.getTime() - dias * 86_400_000),
      }) as Conversation;

    const podadas = podarConversacionesViejas(
      [conv('ayer', 1), conv('hace-veinte', 20), conv('hace-cien', 100)],
      ahora,
    );
    expect(podadas.map((c) => c.id)).toEqual(['ayer', 'hace-veinte']);
  });
});

describe('aprobacionADecision — la MISMA conversión para el stream y el respaldo POST', () => {
  it('convierte la aprobación vinculante en la tarjeta de decisión', () => {
    const ap: BackendPendingApproval = {
      id: 'ap-1',
      agent: 'cobranza',
      actionType: 'payment_plan',
      title: 'Acuerdo de pago',
      description: '3 cuotas de $1.200.000',
      payloadPreview: { cuotas: '3' },
      options: [
        { id: 'si', label: 'Aprobar', description: 'Se registra la decisión', recommendation: 'recommended' },
      ],
      requiresApproval: true,
    };
    expect(aprobacionADecision(ap)).toMatchObject({
      id: 'ap-1',
      approvalId: 'ap-1',
      title: 'Acuerdo de pago',
      category: 'cobranza',
    });
  });
});

/**
 * B1·B2·B3 — un turno que falla.
 *
 * Antes: `finalizeError` escribía un texto fijo en la burbuja con
 * `status: 'complete'` — sin estilo de fallo, sin Reintentar, con el mismo
 * «no pude conectarme» para un 402 (sin créditos de IA), un 429 y un 500; y
 * ese texto viajaba después como `history` al modelo, como si fuera una
 * respuesta.
 */
describe('un turno que falla (B1·B2·B3)', () => {
  const exito = (texto: string) => async (args: { handlers: Record<string, unknown> }) => {
    const h = args.handlers as {
      onMessage: (t: string, a: unknown[]) => void;
      onDone: (f: unknown) => void;
    };
    h.onMessage(texto, []);
    h.onDone({ responseText: texto, suggestedActions: [], dispatches: [] });
  };

  it.each([
    [new ApiError(402, 'Your credit balance is too low'), 'sin créditos de IA'],
    [new ApiError(429, 'Too many requests'), 'demasiadas solicitudes seguidas. Espera un momento'],
    [new ApiError(503, 'Service unavailable'), 'No pude conectarme con el asistente'],
    [new TypeError('Failed to fetch'), 'No pude conectarme con el asistente'],
    [Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' }), 'tardó demasiado'],
  ])('mensajeDeFalloDelChat(%s) dice «%s» y nunca el texto crudo', (error, esperado) => {
    const texto = mensajeDeFalloDelChat(error);
    expect(texto).toContain(esperado);
    expect(texto).not.toContain((error as Error).message);
  });

  it('un 429 con plazo dice cuánto esperar, con la misma frase que el back', () => {
    const error = new ApiError(429, 'Too many requests', 'DEMASIADAS_SOLICITUDES', {
      reintentarEnSegundos: 90,
    });
    expect(mensajeDeFalloDelChat(error)).toBe(
      'Hiciste demasiadas solicitudes seguidas. Espera 2 minutos y vuelve a intentar.',
    );
  });

  it('un 402 deja la burbuja en `error` con el motivo en palabras y la UI desbloqueada', async () => {
    streamChatTurn.mockRejectedValue(new ApiError(402, 'Your credit balance is too low'));
    postChatTurn.mockRejectedValue(new ApiError(402, 'Your credit balance is too low'));
    const s = montar();
    act(() => {
      s.actual.sendMessage('¿cuántos inmuebles tengo?');
    });

    await esperarA(() => s.actual.messages.some((m) => m.role === 'assistant' && m.status === 'error'));
    const burbuja = s.actual.messages.find((m) => m.role === 'assistant')!;
    expect(burbuja.content).toContain('sin créditos de IA');
    expect(burbuja.content).not.toContain('credit balance');
    expect(s.actual.isThinking || s.actual.isStreaming || s.actual.isAgentsRunning).toBe(false);
    s.soltar();
  });

  it('🔴 sin créditos ANUNCIADO dentro del stream: el panel dice el motivo, no «no pude conectarme»', async () => {
    // B2 de la auditoría del 13-09, la mitad que faltaba. Acá el micro ya
    // contestó 200 (es un stream) y el saldo se acaba a mitad de camino: el
    // único lugar donde puede viajar el 402 es el evento `error`. Antes ese
    // evento perdía el código y la burbuja decía «no pude conectarme».
    streamChatTurn.mockImplementation(async (args: { handlers: { onError?: (m: string, meta?: { status?: number; code?: string }) => void } }) => {
      args.handlers.onError?.('La cuenta de IA se quedó sin créditos.', {
        status: 402,
        code: 'sin_creditos_ia',
      });
    });
    const s = montar();
    act(() => {
      s.actual.sendMessage('¿cuánto me deben?');
    });

    await esperarA(() => s.actual.messages.some((m) => m.role === 'assistant' && m.status === 'error'));
    const burbuja = s.actual.messages.find((m) => m.role === 'assistant')!;
    expect(burbuja.content).toContain('sin créditos de IA');
    // Y no reintenta por POST: el saldo no cambia entre un pedido y otro.
    expect(postChatTurn).not.toHaveBeenCalled();
    s.soltar();
  });

  it('un 402 del stream no insiste por el POST: el saldo no cambia entre un pedido y otro', async () => {
    streamChatTurn.mockRejectedValue(new ApiError(402, 'sin saldo'));
    const s = montar();
    act(() => {
      s.actual.sendMessage('hola');
    });
    await esperarA(() => s.actual.messages.some((m) => m.status === 'error'));
    expect(postChatTurn).not.toHaveBeenCalled();
    s.soltar();
  });

  it('Reintentar reenvía EL MISMO texto y no duplica la pregunta', async () => {
    streamChatTurn.mockRejectedValueOnce(new ApiError(503, 'x'));
    postChatTurn.mockRejectedValueOnce(new ApiError(503, 'x'));
    const s = montar();
    act(() => {
      s.actual.sendMessage('¿quién debe más?');
    });
    await esperarA(() => s.actual.messages.some((m) => m.status === 'error'));
    const fallida = s.actual.messages.find((m) => m.status === 'error')!;

    streamChatTurn.mockImplementation(exito('Debe más Ana.'));
    act(() => {
      s.actual.regenerateResponse(fallida.id);
    });
    await esperarA(() =>
      s.actual.messages.some((m) => m.role === 'assistant' && m.status === 'complete'),
    );

    const ultima = streamChatTurn.mock.calls.at(-1)![0] as { message: string };
    expect(ultima.message).toBe('¿quién debe más?');
    expect(s.actual.messages.filter((m) => m.role === 'user')).toHaveLength(1);
    expect(s.actual.messages.some((m) => m.status === 'error')).toBe(false);
    s.soltar();
  });

  it('el turno fallido NO viaja como historial en la pregunta siguiente', async () => {
    streamChatTurn.mockRejectedValueOnce(new ApiError(402, 'x'));
    postChatTurn.mockRejectedValueOnce(new ApiError(402, 'x'));
    const s = montar();
    act(() => {
      s.actual.sendMessage('pregunta que falló');
    });
    await esperarA(() => s.actual.messages.some((m) => m.status === 'error'));

    streamChatTurn.mockImplementation(exito('Listo.'));
    act(() => {
      s.actual.sendMessage('pregunta nueva');
    });
    await esperarA(() => streamChatTurn.mock.calls.length >= 2);

    const { history } = streamChatTurn.mock.calls.at(-1)![0] as {
      history: { role: string; content: string }[];
    };
    const enviado = JSON.stringify(history);
    expect(enviado).not.toContain('pregunta que falló');
    expect(enviado).not.toContain('créditos');
    s.soltar();
  });
});

/**
 * Nico, 23-09 (con capturas del chat del panel):
 *  - «se queda ahí sólo con un texto y sin cargas, no se sabe si sí está
 *    funcionando» → el paso activo dice qué hace (evento `progreso`).
 *  - «Revisar el estado de tu cartera · Sin datos de cartera para esta agencia»
 *    salía del esquema viejo del agente → la cartera del ERP, o el paso se va.
 *  - «usar los componentes de Cadence» → tablas/cifras/entidades del `done`
 *    llegan al mensaje para que las pinte `RespuestaConForma`.
 */
describe('el paso activo está vivo y la respuesta llega con forma (23-09)', () => {
  type Manejadores = {
    onSnapshot: (s: unknown) => void;
    onProgreso: (p: { texto: string; hechos?: number; total?: number }) => void;
    onDispatchStart: (agent: string, task: string) => void;
    onMessage: (t: string, a: unknown[]) => void;
    onDone: (f: unknown) => void;
  };
  const SNAPSHOT_ERP = {
    deudoresActivos: 0,
    pagadoHoyCop: 0,
    llamadasHoy: 0,
    escalacionesPendientes: 0,
    enPrejuridico: 0,
    generatedAt: '2026-09-23T20:00:00.000Z',
    carteraCop: 12_500_000,
    contratosEnCartera: 7,
  };

  it('el `progreso` del micro queda como la actividad del especialista que está corriendo', async () => {
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => (soltar = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      const h = args.handlers;
      h.onSnapshot(SNAPSHOT_ERP);
      h.onDispatchStart('reportes', 'Contar los contratos que vencen en octubre');
      h.onProgreso({ texto: 'Leyendo contratos…' });
      h.onProgreso({ texto: 'Revisando las 29 filas de contratos…', hechos: 29 });
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿qué contratos vencen en octubre?');
    });
    await esperarA(() => s.actual.turnSteps.some((p) => p.kind === 'agente'));
    const agente = s.actual.turnSteps.find((p) => p.kind === 'agente')!;
    expect(agente.status).toBe('running');
    // El último aviso manda: la línea se actualiza, no se acumula.
    expect(agente.actividad).toBe('Revisando las 29 filas de contratos…');
    // «29 filas» sin total: lo dice el texto, no hay barra que dibujar.
    expect(agente.avance).toBeUndefined();
    soltar();
    s.soltar();
  });

  it('un solo paso gira a la vez: el preámbulo no deja «redactar» vivo mientras consulta el especialista', async () => {
    let seguir!: () => void;
    const pausa = new Promise<void>((r) => (seguir = r));
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => (soltar = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores & { onDispatchResult: (d: unknown) => void } }) => {
      const h = args.handlers;
      h.onSnapshot(SNAPSHOT_ERP);
      h.onMessage('Voy a revisar los contratos que vencen en octubre.', []);
      h.onDispatchStart('reportes', 'Listar los contratos que vencen en octubre');
      await pausa;
      h.onDispatchResult({ agent: 'reportes', taskDescription: 't', status: 'completed', summary: '29 contratos' });
      // La vuelta de cierre: nada corre, el aviso es de «redactar».
      h.onProgreso({ texto: 'Cruzando lo que encontré para redactar la respuesta…' });
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿qué contratos vencen en octubre?');
    });
    await esperarA(() => s.actual.turnSteps.some((p) => p.kind === 'agente'));
    expect(s.actual.turnSteps.filter((p) => p.status === 'running').map((p) => p.kind)).toEqual(['agente']);
    expect(s.actual.turnSteps.find((p) => p.id === 'redactar')!.status).toBe('pending');

    seguir();
    await esperarA(() => s.actual.turnSteps.some((p) => p.id === 'redactar' && p.status === 'running'));
    const redactar = s.actual.turnSteps.find((p) => p.id === 'redactar')!;
    expect(redactar.actividad).toBe('Cruzando lo que encontré para redactar la respuesta…');
    soltar();
    s.soltar();
  });

  it('el paso de cartera dice la cartera del ERP y nunca «Sin datos de cartera»', async () => {
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => (soltar = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      args.handlers.onSnapshot(SNAPSHOT_ERP);
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿cuánto me deben?');
    });
    await esperarA(() => s.actual.turnSteps.some((p) => p.id === 'cartera' && p.status === 'done'));
    const cartera = s.actual.turnSteps.find((p) => p.id === 'cartera')!;
    expect(cartera.detailKey).toBe('beta.tasks.detail.carteraErp');
    expect(cartera.detailVars).toMatchObject({ contratos: 7 });
    expect(String(cartera.detailVars!.cartera)).toMatch(/12[.,]500[.,]000/);
    // Y «entender» queda VIVO mientras el modelo decide: la lista nunca se ve muerta.
    expect(s.actual.turnSteps.find((p) => p.id === 'entender')!.status).toBe('running');
    soltar();
    s.soltar();
  });

  it('sin snapshot de la agencia el paso de cartera se va, en vez de decir que no hay datos', async () => {
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => (soltar = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      args.handlers.onSnapshot(null);
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('hola');
    });
    await esperarA(() => s.actual.turnSteps.some((p) => p.id === 'entender' && p.status === 'running'));
    expect(s.actual.turnSteps.some((p) => p.id === 'cartera')).toBe(false);
    soltar();
    s.soltar();
  });

  it('las tablas y entidades del `done` llegan al mensaje del asistente', async () => {
    const tabla = {
      tipo: 'tabla' as const,
      titulo: 'contratos',
      columnas: [{ clave: 'codigo', titulo: 'Código', formato: 'numero' as const }],
      filas: [{ codigo: 101 }],
      total: 1,
      truncada: false,
    };
    const entidad = {
      tipo: 'inquilino' as const,
      id: 'p-1',
      titulo: 'Juan Camilo López',
      motivo: 'nombre',
      documento: null,
      telefono: null,
      correo: null,
      contratos: [],
      totalContratos: 0,
      otrosRoles: [],
    };
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      args.handlers.onMessage('Encontré a Juan Camilo.', []);
      args.handlers.onDone({
        responseText: 'Encontré a Juan Camilo.',
        suggestedActions: [],
        dispatches: [],
        bloques: [tabla],
        entidades: [entidad],
      });
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('busca a Juan Camilo López');
    });
    await esperarA(() => s.actual.messages.some((m) => m.role === 'assistant' && m.status === 'complete'), 8000);
    const respuesta = s.actual.messages.find((m) => m.role === 'assistant')!;
    expect(respuesta.bloques).toEqual([tabla]);
    expect(respuesta.entidades).toEqual([entidad]);
    expect(respuesta.content).toBe('Encontré a Juan Camilo.');
    s.soltar();
  });
});
