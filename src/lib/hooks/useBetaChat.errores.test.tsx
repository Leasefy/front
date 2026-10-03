/**
 * Las acciones del chat cuando fallan (02-10-2026, ola de seguimiento de la
 * tanda de errores): de punta a punta, con el `fetch` falso y los clientes, el
 * stream y el hook de verdad.
 *
 * Cada una dice el error por el traductor —«conexión» sólo sin respuesta; un
 * 4xx lo que está mal; un 5xx «de nuestro lado» con la referencia— y nunca
 * crudo: ni «403», ni «ai-hub chat 500», ni «execute action 409», ni «ai-hub
 * approval 403», ni el `error` en inglés del cuerpo viejo del micro. Y ninguna
 * se traga el fallo en silencio.
 *
 *  1. Enviar un mensaje (el stream y el POST de respaldo).
 *  2. Confirmar una acción propuesta (la tarjeta `AccionPropuestaCard`).
 *  3. Ejecutar una propuesta (`executeAction`).
 *  4. Registrar una aprobación (`resolveChatApproval`): la tarjeta se reabre.
 *  5. La valoración (pulgar).
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

/** Lo que nunca puede llegar a la persona. */
const CRUDO =
  /\b[1-5]\d\d\b|ai-hub|approve|approval|execute action|Forbidden|Internal Server Error|conversation|feedback|Unauthorized|Upstream/i;

const SOBRE_403 = { statusCode: 403, code: 'SIN_PERMISO', message: 'Tu rol no puede hacer esto.' };
const SOBRE_500 = { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor', referencia: 'ab12cd34' };
const VIEJO_403 = { error: 'Forbidden — tu rol sólo puede consultar, no ejecutar acciones', code: 'ROL_SOLO_CONSULTA' };

type Contesta = () => Response | Promise<Response>;
let micro: {
  stream: Contesta;
  post: Contesta;
  aprobacion: Contesta;
  confirmar: Contesta;
  ejecutar: Contesta;
  feedback: Contesta;
};

const json = (status: number, cuerpo?: unknown) =>
  cuerpo === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
// 🔴 ARREGLOS-4: «la conexión» es SÓLO sin internet en el navegador; con el navegador en línea y el back
// sano, el `fetch` al micro que no sale es «el asistente de Leasefy no está disponible» (`agentFetch`).
const sinRed: Contesta = () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  return Promise.reject(new TypeError('Failed to fetch'));
};
const microCaido: Contesta = () => Promise.reject(new TypeError('Failed to fetch'));

function sse(eventos: Array<[string, unknown]>): Response {
  const texto = eventos.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  return new Response(texto, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const done = (texto: string) => [
  'done',
  {
    responseText: texto,
    suggestedActions: [],
    dispatches: [],
    entidades: [],
    bloques: [],
    turnoId: TURNO,
    generatedAt: new Date().toISOString(),
  },
] as [string, unknown];

beforeEach(() => {
  localStorage.clear();
  __olvidarSenalesParaPruebas(50);
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  micro = {
    stream: () => sse([['message', { responseText: 'Listo.', suggestedActions: [] }], done('Listo.')]),
    post: () => json(500, SOBRE_500),
    aprobacion: () => json(200, { ok: true }),
    confirmar: () => json(200, {}),
    ejecutar: () => json(200, {}),
    feedback: () => json(200, { guardado: true, yaRegistrado: false, leccionId: null, motivo: '', registradoEn: '' }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const camino = new URL(url).pathname;
      if (camino.endsWith('/ai-hub/chat/stream')) return micro.stream();
      if (camino.endsWith('/ai-hub/chat')) return micro.post();
      if (camino.includes('/ai-hub/chat/approvals/')) return micro.aprobacion();
      if (camino.includes('/ai-hub/chat/acciones/')) return micro.confirmar();
      if (camino.endsWith('/ai-hub/actions/execute')) return micro.ejecutar();
      if (camino.endsWith('/ai-hub/chat/feedback')) return micro.feedback();
      if (camino.endsWith('/ai-hub/chat/senales')) return json(200, { registrada: true, motivo: '' });
      return json(404, { error: 'no existe' });
    }),
  );
});

afterEach(() => {
  __olvidarSenalesParaPruebas();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

const ultimoAsistente = (s: ReturnType<typeof montar>): ChatMessage | undefined =>
  [...s.actual.messages].reverse().find((m) => m.role === 'assistant');

/** Pregunta y espera a que el turno termine (bien o mal). */
async function preguntar(s: ReturnType<typeof montar>, texto: string) {
  act(() => {
    s.actual.sendMessage(texto);
  });
  await esperarA(() => {
    const m = ultimoAsistente(s);
    return !!m && (m.status === 'complete' || m.status === 'error') && !s.actual.isThinking && !s.actual.isStreaming;
  });
}

// ── 1. Enviar un mensaje ────────────────────────────────────────────────────

describe('1 · enviar un mensaje: la burbuja dice el fallo por el traductor', () => {
  it.each<[string, Contesta, RegExp]>([
    ['un 400 sin cuerpo', () => json(400), /No pude responder esta vez/],
    ['un 409 con el `error` viejo en inglés', () => json(409, { error: 'conversation locked' }), /No pude responder esta vez/],
    ['un 500 sin cuerpo', () => json(500), /No pudimos contestarte: algo falló de nuestro lado/],
    ['un 500 con referencia', () => json(500, SOBRE_500), /de nuestro lado.*ab12cd34/],
    ['un 403 del sobre', () => json(403, SOBRE_403), /no incluye el asistente/],
    ['un 403 del cuerpo viejo', () => json(403, VIEJO_403), /no incluye el asistente/],
    ['la red caída', sinRed, /conexi[oó]n/],
    ['el micro caído con el back sano', microCaido, /asistente de Leasefy/],
  ])('%s → nunca crudo', async (_caso, falla, esperado) => {
    micro.stream = falla;
    micro.post = falla;
    const s = montar();
    await preguntar(s, '¿cuánto debe Juan?');
    const burbuja = ultimoAsistente(s)!;
    expect(burbuja.status).toBe('error');
    expect(burbuja.content).toMatch(esperado);
    expect(burbuja.content).not.toMatch(CRUDO);
    s.soltar();
  });

  it('el 403 del segundo factor sigue diciendo el segundo factor (no «sin permiso»)', async () => {
    const segundoFactor = () =>
      json(403, {
        error: 'Tu rol exige segundo factor. Actívalo en Configuración → Seguridad y vuelve a entrar.',
        code: 'SEGUNDO_FACTOR_REQUERIDO',
      });
    micro.stream = segundoFactor;
    micro.post = segundoFactor;
    const s = montar();
    await preguntar(s, '¿cuánto debe Juan?');
    const texto = ultimoAsistente(s)!.content;
    expect(texto).toContain('segundo factor');
    expect(texto).not.toMatch(/no incluye el asistente/);
    s.soltar();
  });

  it('el evento `error` del stream con un 429: cuánto esperar, nunca el inglés del micro', async () => {
    micro.stream = () => sse([['error', { error: 'Upstream rate limit exceeded', status: 429 }]]);
    const s = montar();
    await preguntar(s, '¿cuánto debe Juan?');
    const texto = ultimoAsistente(s)!.content;
    expect(texto).toMatch(/demasiadas solicitudes/i);
    expect(texto).not.toMatch(CRUDO);
    s.soltar();
  });
});

// ── 2. Confirmar una acción propuesta ───────────────────────────────────────

const PROPUESTA = {
  id: 'p-1',
  accion: 'recordatorio_de_pago',
  titulo: 'Recordatorio de pago',
  resumen: 'Le escribo a Juan Camilo López por el canon de octubre.',
  canal: 'correo',
  destinatarios: [],
  total: 1,
  texto: 'Hola, Juan Camilo…',
  estado: 'pendiente',
  venceEn: new Date(Date.now() + 10 * 60_000).toISOString(),
};

async function conPropuesta() {
  micro.stream = () =>
    sse([
      ['message', { responseText: 'Te dejo el recordatorio listo.', suggestedActions: [] }],
      ['accion_propuesta', { propuesta: PROPUESTA }],
      done('Te dejo el recordatorio listo.'),
    ]);
  const s = montar();
  await preguntar(s, 'recuérdale a Juan que pague');
  await esperarA(() => ultimoAsistente(s)?.accion?.estado === 'pendiente');
  return s;
}

describe('2 · confirmar una acción: la tarjeta dice el fallo por el traductor', () => {
  it.each<[string, Contesta, RegExp]>([
    ['un 500 con referencia', () => json(500, SOBRE_500), /No pudimos confirmar la acción: algo falló de nuestro lado.*ab12cd34/],
    ['un 500 sin cuerpo', () => json(500), /No pudimos confirmar la acción: algo falló de nuestro lado/],
    ['un 400 del sobre', () => json(400, { statusCode: 400, code: 'DATOS_INVALIDOS', message: 'El texto del mensaje es muy largo.' }), /^El texto del mensaje es muy largo\.$/],
    ['un 404 con el `error` viejo', () => json(404, { error: 'Not found' }), /^No se pudo confirmar\. Prueba de nuevo en un momento\.$/],
    ['la red caída', sinRed, /conexi[oó]n/],
  ])('%s', async (_caso, falla, esperado) => {
    const s = await conPropuesta();
    micro.confirmar = falla;
    await act(async () => {
      await s.actual.confirmarAccionDelMensaje(ultimoAsistente(s)!.id);
    });
    const accion = ultimoAsistente(s)!.accion!;
    expect(accion.estado).toBe('pendiente');
    expect(accion.error).toMatch(esperado);
    expect(accion.error).not.toMatch(CRUDO);
    s.soltar();
  });

  it('lo que ya tenía su frase sigue igual: 410 venció, 409 ya se resolvió, 403 tu cuenta no puede', async () => {
    const s = await conPropuesta();
    const id = ultimoAsistente(s)!.id;
    micro.confirmar = () => json(403, { error: 'Forbidden — tu rol no puede ejecutar acciones' });
    await act(async () => {
      await s.actual.confirmarAccionDelMensaje(id);
    });
    expect(ultimoAsistente(s)!.accion!.error).toBe('Tu cuenta no puede ejecutar esta acción.');
    micro.confirmar = () => json(409, { error: 'Esa propuesta ya se canceló.' });
    await act(async () => {
      await s.actual.confirmarAccionDelMensaje(id);
    });
    expect(ultimoAsistente(s)!.accion!.error).toBe('Esa acción ya se resolvió.');
    micro.confirmar = () => json(410, { error: 'La propuesta venció.' });
    await act(async () => {
      await s.actual.confirmarAccionDelMensaje(id);
    });
    expect(ultimoAsistente(s)!.accion!.estado).toBe('vencida');
    s.soltar();
  });
});

// ── 3. Ejecutar una propuesta ───────────────────────────────────────────────

describe('3 · ejecutar una propuesta: el error de la propuesta lo dice el traductor', () => {
  it.each<[string, Contesta, RegExp]>([
    ['un 409 con el `error` viejo en inglés', () => json(409, { error: 'Work item already claimed' }), /^No se pudo ejecutar la acción/],
    ['un 500 sin cuerpo', () => json(500), /No pudimos ejecutar la acción: algo falló de nuestro lado/],
    ['un 500 con referencia', () => json(500, SOBRE_500), /ab12cd34/],
    ['un 403 del sobre', () => json(403, SOBRE_403), /^Tu rol no puede hacer esto\.$/],
  ])('%s', async (_caso, falla, esperado) => {
    micro.stream = () =>
      sse([
        ['message', { responseText: 'Hay un pago por aprobar.', suggestedActions: [] }],
        ['action_proposal', { workItemId: 'wi-1', colaType: 'pagos', action: 'approve', resumen: 'Pago de $500.000' }],
        done('Hay un pago por aprobar.'),
      ]);
    micro.ejecutar = falla;
    const s = montar();
    await preguntar(s, '¿qué pagos hay por aprobar?');
    await esperarA(() => (ultimoAsistente(s)?.actionProposals?.length ?? 0) > 0);
    const id = ultimoAsistente(s)!.id;
    await act(async () => {
      await s.actual.confirmActionProposal(id, 'wi-1').catch(() => undefined);
    });
    const propuesta = ultimoAsistente(s)!.actionProposals![0]!;
    expect(propuesta.status).toBe('error');
    expect(propuesta.error).toMatch(esperado);
    expect(propuesta.error).not.toMatch(CRUDO);
    s.soltar();
  });
});

// ── 4. La aprobación en el chat ─────────────────────────────────────────────

const APROBACION = {
  id: 'ap-1',
  agent: 'cobranza',
  actionType: 'acuerdo_de_pago',
  title: 'Acuerdo de pago',
  description: '3 cuotas de $1.200.000',
  payloadPreview: { cuotas: '3' },
  options: [
    { id: 'si', label: 'Aprobar', description: 'Se registra la decisión', recommendation: 'recommended' },
    { id: 'cancel', label: 'No', description: 'No se aprueba', recommendation: 'neutral' },
  ],
  requiresApproval: true,
};

describe('4 · registrar una aprobación: si falla, avisa y la tarjeta vuelve a quedar abierta', () => {
  it.each<[string, Contesta, RegExp]>([
    ['un 403 del cuerpo viejo', () => json(403, VIEJO_403), /^Tu rol no puede decidir sobre esta propuesta/],
    ['un 403 del sobre', () => json(403, SOBRE_403), /^Tu rol no puede hacer esto\.$/],
    ['un 500 con referencia', () => json(500, SOBRE_500), /No pudimos registrar tu decisión: algo falló de nuestro lado.*ab12cd34/],
    ['un 500 sin cuerpo', () => json(500), /No pudimos registrar tu decisión: algo falló de nuestro lado/],
    ['la red caída', sinRed, /conexi[oó]n/],
  ])('%s', async (_caso, falla, esperado) => {
    micro.stream = () =>
      sse([
        ['message', { responseText: 'Cobranza propone un acuerdo.', suggestedActions: [] }],
        ['pending_approval', { approval: APROBACION }],
        done('Cobranza propone un acuerdo.'),
      ]);
    micro.aprobacion = falla;
    const s = montar();
    await preguntar(s, '¿qué hago con Juan?');
    await esperarA(() => ultimoAsistente(s)?.decision?.approvalId === 'ap-1');
    const id = ultimoAsistente(s)!.id;
    let motivo: unknown;
    await act(async () => {
      motivo = await s.actual.selectDecisionOption(id, 'si');
    });
    expect(typeof motivo).toBe('string');
    expect(motivo).toMatch(esperado);
    expect(motivo).not.toMatch(CRUDO);
    // No quedó registrada: la tarjeta no puede decir «Decidido».
    expect(ultimoAsistente(s)!.decision!.selectedOptionId).toBeUndefined();
    s.soltar();
  });

  it('si quedó registrada: sin motivo y la tarjeta queda decidida', async () => {
    micro.stream = () =>
      sse([
        ['message', { responseText: 'Cobranza propone un acuerdo.', suggestedActions: [] }],
        ['pending_approval', { approval: APROBACION }],
        done('Cobranza propone un acuerdo.'),
      ]);
    const s = montar();
    await preguntar(s, '¿qué hago con Juan?');
    await esperarA(() => ultimoAsistente(s)?.decision?.approvalId === 'ap-1');
    let motivo: unknown = 'sin llamar';
    await act(async () => {
      motivo = await s.actual.selectDecisionOption(ultimoAsistente(s)!.id, 'si');
    });
    expect(motivo).toBeNull();
    expect(ultimoAsistente(s)!.decision!.selectedOptionId).toBe('si');
    s.soltar();
  });
});

// ── 5. La valoración ────────────────────────────────────────────────────────

describe('5 · el pulgar: si no se guardó, dice por qué', () => {
  it.each<[string, Contesta, RegExp]>([
    ['un 403 del cuerpo viejo', () => json(403, { error: 'Forbidden — no eres miembro activo', code: 'SIN_MEMBRESIA_ACTIVA' }), /^No pude guardar tu valoración\. Intenta de nuevo\.$/],
    ['un 400 del sobre', () => json(400, { statusCode: 400, code: 'DATOS_INVALIDOS', message: 'El comentario no puede pasar de 1.000 caracteres.' }), /^El comentario no puede pasar de 1\.000 caracteres\.$/],
    ['un 500 con referencia', () => json(500, SOBRE_500), /No pudimos guardar tu valoración: algo falló de nuestro lado.*ab12cd34/],
    ['la red caída', sinRed, /conexi[oó]n/],
  ])('%s', async (_caso, falla, esperado) => {
    micro.feedback = falla;
    const s = montar();
    await preguntar(s, '¿cuánto debe Juan?');
    let r: unknown;
    await act(async () => {
      r = await s.actual.rateMessage(ultimoAsistente(s)!.id, 'up');
    });
    expect(typeof r).toBe('string');
    expect(r).toMatch(esperado);
    expect(r).not.toMatch(CRUDO);
    s.soltar();
  });

  it('si se guardó, `true` como siempre', async () => {
    const s = montar();
    await preguntar(s, '¿cuánto debe Juan?');
    let r: unknown;
    await act(async () => {
      r = await s.actual.rateMessage(ultimoAsistente(s)!.id, 'up');
    });
    expect(r).toBe(true);
    s.soltar();
  });
});
