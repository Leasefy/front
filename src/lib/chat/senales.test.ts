/**
 * Las señales de la pantalla para el cerebro del micro (23-09).
 *
 *  1. La ruta y el cuerpo que SALEN por la red son los del esquema REAL del
 *     micro (`contrato-del-chat-del-micro.json`, sacado de su
 *     `openapi-snapshot.json`, que su propia prueba ata a los archivos de
 *     ruta). No un espía que repite lo que pedimos: el 22-09 un espía así dejó
 *     pasar un botón con 404 en cada clic.
 *  2. Fuego y olvido: un 500, una red caída o un `fetch` que revienta no
 *     lanzan, no se esperan y no se reintentan.
 *  3. Nada de datos personales: sólo tipo + id de la entidad.
 *  4. El abandono: sin terminar o sin mirar, nunca un turno que se usó.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONTRATO_SACADO_DE,
  erroresContraElEsquema,
  rutaDelMicro,
} from '@/lib/api/contrato-del-chat-del-micro';
import { setAccessToken } from '@/lib/api/client';
import type { ChatMessage } from '@/lib/types/beta-chat';

import {
  ESPERA_AL_REGISTRO_DEL_TURNO_MS,
  MIRADA_MINIMA_MS,
  TIPOS_DE_SENAL_DE_PANTALLA,
  __olvidarSenalesParaPruebas,
  crearTestigoDeTurnos,
  mandarSenal,
  mandarSenalEnUnMomento,
  type SenalDePantalla,
} from './senales';

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
const PROPUESTA = 'prop-7d1e';

type Llamada = { url: string; init: RequestInit };
let llamadas: Llamada[];
let responder: () => Promise<Response>;

beforeEach(() => {
  __olvidarSenalesParaPruebas();
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  llamadas = [];
  responder = async () => new Response(JSON.stringify({ registrada: true, motivo: 'Anotado.' }), { status: 200 });
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      return responder();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

/** La única llamada que salió, con su cuerpo ya leído. */
function laLlamada(): { url: string; init: RequestInit; cuerpo: Record<string, unknown> } {
  expect(llamadas).toHaveLength(1);
  const { url, init } = llamadas[0];
  return { url, init, cuerpo: JSON.parse(String(init.body)) as Record<string, unknown> };
}

/** Compara la llamada contra el contrato del micro: ruta existente + cuerpo estricto. */
function cumpleElContrato(url: string, init: RequestInit) {
  const r = rutaDelMicro(String(init.method), url);
  expect(r, `${init.method} ${url} no existe en el micro (${CONTRATO_SACADO_DE})`).not.toBeNull();
  expect(r!.clave).toBe('POST /api/agency/{agencyId}/ai-hub/chat/senales');
  expect(erroresContraElEsquema(r!.ruta.cuerpo!, JSON.parse(String(init.body)))).toEqual([]);
}

describe('la ruta y el cuerpo son los del esquema real del micro', () => {
  const casos: Array<[string, SenalDePantalla]> = [
    ['tarjeta abierta con su entidad', { turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: { tipo: 'inquilino', id: 'per_1291' } }],
    ['«Ver las N filas» (sin entidad)', { turnoId: TURNO, tipo: 'tarjeta_abierta' }],
    ['deshacer, con la propuesta', { turnoId: TURNO, tipo: 'accion_deshecha', propuestaId: PROPUESTA }],
    ['abandono', { turnoId: TURNO, tipo: 'abandono' }],
  ];

  it.each(casos)('%s', (_n, senal) => {
    expect(mandarSenal(AGENCIA, senal)).toBe(true);
    const { url, init, cuerpo } = laLlamada();
    expect(url).toBe(`http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/senales`);
    cumpleElContrato(url, init);
    expect(cuerpo.turnoId).toBe(TURNO);
    expect(cuerpo.tipo).toBe(senal.tipo);
  });

  it('todo tipo que la pantalla puede mandar, el micro lo acepta', () => {
    const r = rutaDelMicro('POST', `http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/senales`)!;
    const enumDelMicro = r.ruta.cuerpo!.properties!.tipo.enum;
    for (const tipo of TIPOS_DE_SENAL_DE_PANTALLA) expect(enumDelMicro).toContain(tipo);
  });

  it('el validador no es de adorno: una llave inventada o un turno que no es uuid fallan', () => {
    const r = rutaDelMicro('POST', `/api/agency/${AGENCIA}/ai-hub/chat/senales`)!;
    expect(
      erroresContraElEsquema(r.ruta.cuerpo!, { turnoId: 'msg_123', tipo: 'clic', nombre: 'Juan' }),
    ).toEqual([
      'cuerpo.turnoId: no es un uuid',
      'cuerpo.tipo: «clic» no está en ["tarjeta_abierta","accion_deshecha","abandono"]',
      'cuerpo.nombre: el micro no declara esta llave (la borraría en silencio)',
    ]);
    // Y una ruta que el micro no tiene, no existe.
    expect(rutaDelMicro('POST', `/api/agency/${AGENCIA}/ai-hub/chat/senal`)).toBeNull();
  });

  it('sale con el bearer, como JSON y con keepalive (sobrevive al cierre de la pestaña)', () => {
    mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' });
    const { init } = laLlamada();
    const h = new Headers(init.headers);
    expect(h.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(h.get('content-type')).toBe('application/json');
    expect(init.keepalive).toBe(true);
  });
});

describe('fuego y olvido', () => {
  it('no espera la respuesta: vuelve enseguida aunque el micro no conteste nunca', () => {
    responder = () => new Promise<Response>(() => {});
    expect(mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' })).toBe(true);
    expect(llamadas).toHaveLength(1);
  });

  it('un 500 no lanza y no se reintenta', async () => {
    responder = async () => new Response('{"error":"boom"}', { status: 500 });
    const senal: SenalDePantalla = { turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: { tipo: 'contrato', id: 'c-1' } };
    expect(() => mandarSenal(AGENCIA, senal)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    // El mismo clic otra vez: ya salió una vez, no vuelve a salir.
    expect(mandarSenal(AGENCIA, senal)).toBe(false);
    expect(llamadas).toHaveLength(1);
  });

  it('una red caída no deja un rechazo sin atender (vitest lo reportaría) ni se reintenta', async () => {
    responder = () => Promise.reject(new TypeError('Failed to fetch'));
    expect(mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' })).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' })).toBe(false);
    expect(llamadas).toHaveLength(1);
  });

  it('un `fetch` que revienta al llamarlo tampoco lanza', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new TypeError('keepalive no soportado');
      }),
    );
    expect(() => mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' })).not.toThrow();
  });

  it('sin turno válido, sin agencia o sin micro configurado no sale nada', () => {
    expect(mandarSenal(AGENCIA, { turnoId: undefined, tipo: 'abandono' })).toBe(false);
    // El id del mensaje del FRONT no es un turno del micro.
    expect(mandarSenal(AGENCIA, { turnoId: 'msg_1727140000_ab12', tipo: 'abandono' })).toBe(false);
    expect(mandarSenal(null, { turnoId: TURNO, tipo: 'abandono' })).toBe(false);
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    expect(mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'abandono' })).toBe(false);
    expect(llamadas).toHaveLength(0);
  });
});

describe('con la página viva, la señal espera a que el micro anote el turno', () => {
  it('no sale enseguida (el micro anota el turno ~0,7 s después del `done`); sale después, una vez', () => {
    vi.useFakeTimers();
    try {
      mandarSenalEnUnMomento(AGENCIA, { turnoId: TURNO, tipo: 'abandono' });
      vi.advanceTimersByTime(ESPERA_AL_REGISTRO_DEL_TURNO_MS - 1);
      expect(llamadas).toHaveLength(0);
      vi.advanceTimersByTime(1);
      const { url, init, cuerpo } = laLlamada();
      cumpleElContrato(url, init);
      expect(cuerpo).toEqual({ turnoId: TURNO, tipo: 'abandono' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('nada de datos personales', () => {
  it('de la tarjeta entera sólo viajan su tipo y su id', () => {
    const tarjeta = {
      tipo: 'inquilino',
      id: 'per_1291',
      titulo: 'Juan Camilo López',
      documento: '1020304050',
      telefono: '3001234567',
      correo: 'juan@correo.co',
    };
    mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: tarjeta });
    const { init, cuerpo } = laLlamada();
    expect(cuerpo).toEqual({ turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: { tipo: 'inquilino', id: 'per_1291' } });
    for (const dato of ['Juan Camilo', '1020304050', '3001234567', 'juan@correo.co']) {
      expect(String(init.body)).not.toContain(dato);
    }
  });

  it('una entidad que no cabe en el esquema sale sin ella (recortarla sería otro id)', () => {
    mandarSenal(AGENCIA, { turnoId: TURNO, tipo: 'tarjeta_abierta', entidad: { tipo: 'contrato', id: 'x'.repeat(81) } });
    const { url, init, cuerpo } = laLlamada();
    expect(cuerpo).toEqual({ turnoId: TURNO, tipo: 'tarjeta_abierta' });
    cumpleElContrato(url, init);
  });
});

describe('el abandono', () => {
  const mensaje = (extra: Partial<ChatMessage> = {}): ChatMessage => ({
    id: 'm1',
    role: 'assistant',
    content: 'Juan Camilo está al día.',
    timestamp: new Date(),
    status: 'complete',
    turnoId: TURNO,
    ...extra,
  });

  function testigo(visible = true) {
    let t = 1_000_000;
    let aLaVista = visible;
    const tg = crearTestigoDeTurnos({ ahora: () => t, aLaVistaAhora: () => aLaVista });
    return {
      tg,
      pasan: (ms: number) => {
        t += ms;
      },
      seVe: () => {
        aLaVista = true;
        tg.aLaVista();
      },
    };
  }

  it('un turno de otra sesión (vuelto a cargar del navegador) no se juzga', () => {
    const { tg } = testigo();
    expect(tg.esAbandono(mensaje({ status: 'streaming' }))).toBe(false);
  });

  it('irse con la respuesta todavía mostrándose es un turno sin terminar', () => {
    const { tg, pasan } = testigo();
    tg.llego(TURNO);
    pasan(30_000);
    expect(tg.esAbandono(mensaje({ status: 'streaming' }))).toBe(true);
  });

  it('irse sin contestar la acción que dejó preparada es un turno sin terminar', () => {
    const { tg, pasan } = testigo();
    tg.llego(TURNO);
    pasan(60_000);
    const accion = { propuesta: {} as never, estado: 'pendiente' as const };
    expect(tg.esAbandono(mensaje({ accion }))).toBe(true);
    expect(tg.esAbandono(mensaje({ accion: { ...accion, estado: 'ejecutada' } }))).toBe(false);
  });

  it('terminada: si se fue antes de mirarla es abandono; si la miró, no', () => {
    const { tg, pasan } = testigo();
    tg.llego(TURNO);
    pasan(MIRADA_MINIMA_MS - 500);
    expect(tg.esAbandono(mensaje())).toBe(true);
    pasan(1000);
    expect(tg.esAbandono(mensaje())).toBe(false);
  });

  it('llegó con la pestaña oculta y nunca volvió: no la miró', () => {
    const { tg, pasan, seVe } = testigo(false);
    tg.llego(TURNO);
    pasan(10 * 60_000);
    expect(tg.esAbandono(mensaje())).toBe(true);
    seVe();
    pasan(MIRADA_MINIMA_MS + 1);
    expect(tg.esAbandono(mensaje())).toBe(false);
  });

  it('un turno que se usó (pulgar o tarjeta) nunca es abandono', () => {
    const { tg } = testigo();
    tg.llego(TURNO);
    expect(tg.esAbandono(mensaje({ status: 'streaming', feedback: 'up' }))).toBe(false);
    tg.tocado(TURNO);
    expect(tg.esAbandono(mensaje({ status: 'streaming' }))).toBe(false);
  });
});
