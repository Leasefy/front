/**
 * @vitest-environment happy-dom
 */
/**
 * Las tarjetas del EJECUTOR en el hilo (24-09, paquete F del chat piloto).
 *
 * Se pintan a través de `AccionesEnElHilo`, como en el chat de verdad, con
 * las tarjetas TAL COMO LAS MANDA EL MICRO (`tarjetas-de-ejecucion.fixtures`,
 * validadas contra su esquema en `tarjetas-de-ejecucion.test.ts`).
 *
 * Lo que vigilan, además de que cada tipo se vea:
 *   · cada botón es un MENSAJE DE LA PERSONA con la intención que trajo la
 *     tarjeta; ninguno navega ni se inventa («Deshacer» sólo si viene);
 *   · la cuenta regresiva de la gracia (P-10) se ve cada segundo pero se
 *     ANUNCIA tres veces, y al llegar a cero pide la tarjeta al día;
 *   · con la tarjeta nueva, la confirmación de siempre no sale dos veces.
 */

import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto, procesos, supabase, auth } = vi.hoisted(() => ({
  contexto: {
    sendMessage: vi.fn(),
    anotarTarjetaAbierta: vi.fn(),
    refrescarEjecucion: vi.fn(),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
    messages: [] as unknown[],
  },
  procesos: { ver: vi.fn(), cancelar: vi.fn() },
  supabase: {
    auth: { mfa: { listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn() } },
  },
  auth: { setMfaVerified: vi.fn() },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));
vi.mock('@/lib/api/procesos.service', () => ({ procesosApi: procesos, RECURSO_DE_PROCESOS: 'procesos' }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => supabase }));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => auth }));

import { AccionesEnElHilo } from './AccionesEnElHilo';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { leerTarjetaDeEjecucion, type TarjetaDeEjecucion } from '@/lib/chat/tarjetas-de-ejecucion';
import {
  CONTRATO_24,
  EJECUCION,
  PROCESO,
  enCurso,
  enGracia,
  errorDePermiso,
  hecha,
  programada,
  propuestaDeRenovacion,
  propuestaDelLote,
} from '@/lib/chat/tarjetas-de-ejecucion.fixtures';

function mensaje(ejecucion: unknown, parcial: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'a-1',
    role: 'assistant',
    content: 'Antes de hacerlo, confírmame:',
    timestamp: new Date(),
    status: 'complete',
    turnoId: 't-1',
    ejecucion: leerTarjetaDeEjecucion(ejecucion) as TarjetaDeEjecucion,
    ...parcial,
  };
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  contexto.sendMessage.mockReset();
  contexto.refrescarEjecucion.mockReset().mockResolvedValue(null);
  contexto.messages = [];
  contexto.isThinking = false;
  procesos.ver.mockReset();
  procesos.cancelar.mockReset();
  supabase.auth.mfa.listFactors.mockReset();
  supabase.auth.mfa.challenge.mockReset();
  supabase.auth.mfa.verify.mockReset();
  auth.setMfaVerified.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const pintar = (m: ChatMessage, posteriores: ChatMessage[] = []) => {
  contexto.messages = [m, ...posteriores];
  act(() => root.render(<AccionesEnElHilo message={m} />));
};
const tarjeta = () => container.querySelector<HTMLElement>('[data-testid="tarjeta-de-ejecucion"]')!;
const boton = (texto: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto || b.textContent?.includes(texto));
const esOutline = (b: HTMLElement) => b.className.includes('bg-transparent') && b.className.includes('border-border');
const flush = () => act(async () => {});

/** La persona respondió con un botón (queda en el hilo después de la tarjeta). */
const respuesta = (accion: 'confirmar' | 'cancelar' | 'deshacer'): ChatMessage => ({
  id: 'u-2',
  role: 'user',
  content: 'x',
  timestamp: new Date(),
  status: 'complete',
  intencion: { accion, propuestaId: EJECUCION },
});

afterEach(() => {
  // 🔴 Todo dentro del chat: ninguna tarjeta tiene un enlace.
  expect(container.querySelector('a')).toBeNull();
});

// ── Propuesta ───────────────────────────────────────────────────────────────

describe('Propuesta', () => {
  it('con la tarjeta nueva, la confirmación de siempre (la misma ejecución) no sale dos veces', () => {
    pintar(
      mensaje(propuestaDeRenovacion(), {
        confirmacion: {
          propuestaId: EJECUCION,
          accion: 'abrir_renovacion',
          titulo: 'Abrir la renovación del contrato 24',
          frase: 'Voy a abrir la renovación del contrato 24 con el incremento del IPC.',
          pregunta: '¿Lo hago?',
          porQue: '',
          modo: 'copiloto',
          riesgo: { muevePlata: false, escribeATerceros: false, irreversible: false },
          venceEn: null,
        },
      }),
    );
    expect(container.querySelectorAll('[data-testid="tarjeta-de-ejecucion"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="tarjeta-de-confirmacion"]')).toBeNull();
  });

  it('una caja: qué es, la frase, la vista previa de lo que va a quedar y «Hacerlo» / «No»', () => {
    pintar(mensaje(propuestaDeRenovacion()));
    const t = tarjeta();
    expect(t.dataset.tipo).toBe('propuesta');
    expect(t.getAttribute('role')).toBe('region');
    expect(t.querySelector('header')!.textContent).toContain('Abrir la renovación del contrato 24');
    expect(t.querySelector('header')!.textContent).toContain('Espera tu respuesta');
    expect(t.textContent).toContain('Voy a abrir la renovación del contrato 24 con el incremento del IPC. ¿Lo hago?');

    const vista = t.querySelector('[data-testid="vista-previa"]')!;
    expect(vista.getAttribute('aria-label')).toBe('Lo que va a quedar');
    expect(vista.textContent).toContain('Canon nuevo');
    expect(vista.textContent).toMatch(/\$\s1\.580\.000/);
    expect(vista.textContent).not.toContain(CONTRATO_24);
    // 12 cuotas: se ven 8 y el resto a un clic, dentro de la caja.
    expect(vista.querySelectorAll('tbody tr')).toHaveLength(8);
    const verMas = boton('Ver 4 más')!;
    expect(esOutline(verMas)).toBe(true);
    act(() => verMas.click());
    expect(vista.querySelectorAll('tbody tr')).toHaveLength(12);

    // El pie: el primario y el secundario en outline del DS.
    const pie = t.querySelector('[data-pie-de-caja]')!;
    const [hacerlo, no] = [...pie.querySelectorAll('button')];
    expect(hacerlo.textContent).toBe('Hacerlo');
    expect(no.textContent).toBe('No');
    expect(esOutline(no)).toBe(true);
    act(() => hacerlo.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('Sí, hazlo', {
      intencion: { accion: 'confirmar', propuestaId: EJECUCION },
    });
    act(() => no.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('No, no lo hagas', {
      intencion: { accion: 'cancelar', propuestaId: EJECUCION },
    });
  });

  it('ya contestada o vencida: sin botones, y dice qué pasó', () => {
    pintar(mensaje(propuestaDeRenovacion()), [respuesta('confirmar')]);
    expect(tarjeta().querySelectorAll('button')).toHaveLength(1); // sólo «Ver 4 más»
    expect(tarjeta().textContent).toContain('Dijiste que sí.');

    pintar(mensaje(propuestaDeRenovacion('2020-01-01T00:00:00.000Z')));
    expect(boton('Hacerlo')).toBeUndefined();
    expect(tarjeta().dataset.estado).toBe('vencida');
    expect(tarjeta().textContent).toContain('Venció sin respuesta');
  });

  it('los riesgos con su palabra (no sólo un ícono), del más grave al más leve', () => {
    pintar(mensaje(propuestaDelLote()));
    const riesgos = [...tarjeta().querySelectorAll('[data-testid="riesgos-de-la-accion"] li')].map((li) => li.textContent);
    expect(riesgos).toEqual(['No se puede deshacer', 'Mueve plata', 'Masiva (hasta 10)', 'Doble control']);
    expect(tarjeta().querySelector('[data-testid="riesgos-de-la-accion"]')!.getAttribute('aria-label')).toBe('Qué implica');
  });

  it('doble control (P-4): administrador → lo puede aprobar él mismo, y queda en la bitácora', () => {
    pintar(mensaje(propuestaDelLote('la_puedes_hacer_tu')));
    const dc = tarjeta().querySelector('[data-testid="doble-control"]')!;
    expect(dc.textContent).toContain('Eres administrador: puedes aprobarlo tú (queda en la bitácora que fuiste la misma persona).');
    expect(dc.textContent).toContain('Tú armas el lote y tú lo apruebas.');
  });

  it('doble control con otra persona: «esto lo aprueba otra persona»', () => {
    pintar(mensaje(propuestaDelLote('otra_persona')));
    const dc = tarjeta().querySelector('[data-testid="doble-control"]')!;
    expect(dc.textContent).toContain('Esto lo aprueba otra persona.');
    expect(dc.textContent).toContain('Ana Gómez o Carlos Ruiz lo aprueban.');
  });

  it('fuera de horario dice que queda programada; sin vista previa, dice por qué', () => {
    pintar(mensaje(propuestaDelLote()));
    expect(tarjeta().textContent).toContain('Si dices que sí, queda programada para mañana a las 8:00 a. m.');
    expect(tarjeta().querySelector('[data-testid="vista-previa"]')!.textContent).toContain(
      'El ERP no dio la vista previa a tiempo.',
    );
  });
});

// ── En curso ────────────────────────────────────────────────────────────────

const proceso = (parcial: Record<string, unknown> = {}) => ({
  id: PROCESO,
  tipo: 'EMISION_DE_FACTURAS',
  titulo: 'Emitir facturas',
  estado: 'CORRIENDO',
  hechos: 3,
  total: 10,
  porcentaje: 30,
  mensaje: 'Factura 3 de 10',
  lanzadoPor: null,
  esMio: true,
  recurso: null,
  archivo: null,
  sePuedeCancelar: true,
  cancelacionPedida: false,
  interrumpido: false,
  createdAt: '',
  iniciadoAt: null,
  terminadoAt: null,
  actualizadoAt: '',
  ...parcial,
});

describe('En curso', () => {
  it('la barra hechos/total del Centro de procesos y «Cancelar» (outline) si el back dice que se puede', async () => {
    vi.useFakeTimers();
    procesos.ver.mockResolvedValue(proceso());
    procesos.cancelar.mockResolvedValue(proceso({ cancelacionPedida: true, sePuedeCancelar: false }));
    pintar(mensaje(enCurso(), { content: 'Lo estoy haciendo…' }));
    await flush();
    expect(procesos.ver).toHaveBeenCalledWith(PROCESO);
    const t = tarjeta();
    expect(t.dataset.tipo).toBe('en_curso');
    // 🔴 No es una región viva: la barra cambia y el lector no relee la tarjeta.
    expect(t.getAttribute('role')).toBe('region');
    expect(t.querySelector('[data-testid="avance-del-proceso"]')!.textContent).toContain('3 de 10 · Factura 3 de 10');
    expect(t.querySelector('[role="progressbar"]')).not.toBeNull();
    // El texto de arriba ya dijo «Lo estoy haciendo…»: la tarjeta no lo repite.
    expect(t.textContent).not.toContain('Lo estoy haciendo…');

    const cancelar = boton('Cancelar')!;
    expect(esOutline(cancelar)).toBe(true);
    await act(async () => cancelar.click());
    expect(procesos.cancelar).toHaveBeenCalledWith(PROCESO);
    expect(boton('Cancelar')).toBeUndefined();
    expect(t.textContent).toContain('Pediste cancelarlo');
  });

  it('cuando el Centro de procesos lo ve terminar, pide UNA vez la tarjeta al día al micro', async () => {
    vi.useFakeTimers();
    procesos.ver.mockResolvedValueOnce(proceso()).mockResolvedValue(proceso({ estado: 'TERMINADO', hechos: 10 }));
    pintar(mensaje(enCurso()));
    await flush();
    expect(contexto.refrescarEjecucion).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(contexto.refrescarEjecucion).toHaveBeenCalledWith('a-1', EJECUCION);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(contexto.refrescarEjecucion).toHaveBeenCalledTimes(1);
    expect(procesos.ver).toHaveBeenCalledTimes(2);
  });

  it('sin `sePuedeCancelar` no hay «Cancelar» (no se inventa)', async () => {
    procesos.ver.mockResolvedValue(proceso({ sePuedeCancelar: false }));
    pintar(mensaje(enCurso()));
    await flush();
    expect(boton('Cancelar')).toBeUndefined();
  });
});

// ── Resultado con la gracia de P-10 ─────────────────────────────────────────

describe('Resultado en la gracia (P-10): «Se envía en 0:45 · Deshacer»', () => {
  const AHORA = Date.parse('2026-09-24T14:00:00.000Z');
  const HASTA = new Date(AHORA + 45_000).toISOString();

  it('la cuenta se ve cada segundo, se ANUNCIA tres veces y al llegar a cero pide la tarjeta al día', async () => {
    vi.useFakeTimers({ now: AHORA });
    pintar(mensaje(enGracia(HASTA)));
    const t = tarjeta();
    expect(t.getAttribute('role')).toBe('region');
    const reloj = () => t.querySelector('[role="timer"]')?.textContent;
    const anuncio = () => t.querySelector('[data-testid="anuncio-de-la-cuenta"]')!;
    expect(t.querySelector('[data-testid="cuenta-regresiva"]')!.textContent).toBe('Se envía en 0:45');
    expect(anuncio().getAttribute('aria-live')).toBe('polite');
    // El reloj mismo es un `timer`: los lectores no lo anuncian solos.
    expect(t.querySelector('[role="timer"]')!.hasAttribute('aria-live')).toBe(false);

    const deshacer = boton('Deshacer')!;
    expect(esOutline(deshacer)).toBe(true);
    const anuncios = new Set([anuncio().textContent]);
    for (let s = 1; s <= 44; s++) {
      act(() => vi.advanceTimersByTime(1000));
      anuncios.add(anuncio().textContent);
    }
    expect(reloj()).toBe('0:01');
    expect(contexto.refrescarEjecucion).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    anuncios.add(anuncio().textContent);
    expect([...anuncios]).toEqual([
      'Se envía en 45 segundos. Puedes deshacerlo antes.',
      'Quedan 10 segundos para deshacerlo.',
      'Se está enviando: ya no se puede deshacer.',
    ]);
    expect(contexto.refrescarEjecucion).toHaveBeenCalledWith('a-1', EJECUCION);
    // A cero ya no se ofrece deshacer: está saliendo.
    expect(boton('Deshacer')).toBeUndefined();
    expect(t.querySelector('[data-testid="gracia-enviando"]')!.textContent).toBe('Enviándolo…');
  });

  it('si el texto de la respuesta ya dijo el resumen, la tarjeta no lo repite: la fila de la cuenta es su contenido', () => {
    vi.useFakeTimers({ now: AHORA });
    pintar(mensaje(enGracia(HASTA), { content: 'Le mando el estado de cuenta a Mateo Pérez por correo.' }));
    const t = tarjeta();
    expect(t.textContent).not.toContain('Le mando el estado de cuenta');
    expect(t.querySelector('[data-pie-de-caja]')).toBeNull();
    expect(t.querySelector('[data-testid="cuenta-regresiva"]')!.textContent).toBe('Se envía en 0:45');
    expect(boton('Deshacer')).toBeDefined();
  });

  it('«Deshacer» antes de cero es un mensaje de la persona con la intención que trajo la tarjeta', () => {
    vi.useFakeTimers({ now: AHORA });
    pintar(mensaje(enGracia(HASTA)));
    act(() => boton('Deshacer')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Deshacer', {
      intencion: { accion: 'deshacer', propuestaId: EJECUCION },
    });
  });

  it('pedido el «Deshacer», la cuenta se detiene y ya no pide nada al llegar a cero', async () => {
    vi.useFakeTimers({ now: AHORA });
    pintar(mensaje(enGracia(HASTA)), [respuesta('deshacer')]);
    expect(tarjeta().querySelector('[role="timer"]')).toBeNull();
    expect(tarjeta().textContent).toContain('Pediste deshacerlo.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(contexto.refrescarEjecucion).not.toHaveBeenCalled();
  });

  it('volver a una gracia que ya terminó (recargar) pide la tarjeta al día de una; si sigue en gracia, reintenta poco y lo dice', async () => {
    vi.useFakeTimers({ now: AHORA + 120_000 });
    contexto.refrescarEjecucion.mockResolvedValue(leerTarjetaDeEjecucion(enGracia(HASTA)));
    pintar(mensaje(enGracia(HASTA)));
    await flush();
    expect(contexto.refrescarEjecucion).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(contexto.refrescarEjecucion).toHaveBeenCalledTimes(3);
    expect(tarjeta().textContent).toContain('No pude confirmar que salió.');
  });
});

// ── Resultado ───────────────────────────────────────────────────────────────

describe('Resultado', () => {
  it('«Deshacer» sólo si la tarjeta lo trae (el micro ya filtró por permiso)', () => {
    pintar(mensaje(hecha(true), { content: 'Listo.' }));
    const t = tarjeta();
    expect(t.dataset.estado).toBe('hecha');
    expect(t.textContent).toContain('Registré el pago de $1.550.000 (recibo RC-0192).');
    const anular = boton('Anular el recibo')!;
    expect(esOutline(anular)).toBe(true);
    act(() => anular.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Anular el recibo', {
      intencion: { accion: 'deshacer', propuestaId: EJECUCION },
    });

    pintar(mensaje(hecha(false), { content: 'Listo.' }));
    expect(tarjeta().querySelectorAll('button')).toHaveLength(0);
    expect(tarjeta().querySelector('[data-pie-de-caja]')).toBeNull();
  });
});

// ── Programada ──────────────────────────────────────────────────────────────

describe('Programada (fuera del horario de ley)', () => {
  it('«Lo programé para mañana a las 8:00 a. m.», con «No mandarlo» si el micro lo ofrece', () => {
    pintar(mensaje(programada()));
    const t = tarjeta();
    expect(t.dataset.tipo).toBe('programada');
    expect(t.textContent).toContain('Lo programé para mañana a las 8:00 a. m.');
    expect(t.textContent).toContain('Está fuera del horario de cobranza');
    const no = boton('No mandarlo')!;
    expect(esOutline(no)).toBe(true);
    act(() => no.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('No mandarlo', {
      intencion: { accion: 'deshacer', propuestaId: EJECUCION },
    });
    // Con la hora por delante no se pregunta nada al micro.
    expect(contexto.refrescarEjecucion).not.toHaveBeenCalled();

    pintar(mensaje(programada('2099-01-01T13:00:00.000Z', false)));
    expect(tarjeta().querySelectorAll('button')).toHaveLength(0);
  });

  it('al volver con la hora ya pasada, pide la tarjeta al día UNA vez (el micro la manda ahora)', () => {
    pintar(mensaje(programada('2020-01-01T13:00:00.000Z')));
    expect(contexto.refrescarEjecucion).toHaveBeenCalledTimes(1);
    expect(contexto.refrescarEjecucion).toHaveBeenCalledWith('a-1', EJECUCION);
    pintar(mensaje(programada('2020-01-01T13:00:00.000Z')));
    expect(contexto.refrescarEjecucion).toHaveBeenCalledTimes(1);
  });
});

// ── Error explicado (§4.3) ──────────────────────────────────────────────────

/** React escucha el `input` nativo, no la asignación a `.value`. */
async function escribirCodigo(codigo: string) {
  const casillas = [...container.querySelectorAll<HTMLInputElement>('[data-testid="segundo-factor"] input')];
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  for (let i = 0; i < codigo.length; i++) {
    await act(async () => {
      setter.call(casillas[i], codigo[i]);
      casillas[i].dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

describe('Error explicado', () => {
  it('es su propia tarjeta (no un Resultado «fallida»): el mensaje del back tal cual y quién sí puede', () => {
    pintar(mensaje(errorDePermiso(false), { content: 'No se pudo.' }));
    const t = tarjeta();
    expect(t.dataset.tipo).toBe('error');
    expect(container.querySelector('[data-testid="tarjeta-de-resultado"]')).toBeNull();
    expect(t.querySelector('header')!.textContent).toContain('No se pudo');
    expect(t.textContent).toContain('Tu rol no puede registrar recibos de caja. No se hizo nada.');
    expect(t.textContent).toContain('Permiso que falta: recibos · create');
    expect(t.querySelector('[data-testid="quienes-pueden"]')!.textContent).toBe('Lo pueden hacer: Ana Gómez, Carlos Ruiz.');
    expect(t.querySelectorAll('button')).toHaveLength(0);

    pintar(mensaje(errorDePermiso(false, []), { content: 'No se pudo.' }));
    expect(tarjeta().querySelector('[data-testid="quienes-pueden"]')!.textContent).toBe(
      'Hoy nadie de tu inmobiliaria tiene ese permiso.',
    );
    pintar(mensaje(errorDePermiso(false, null), { content: 'No se pudo.' }));
    expect(tarjeta().querySelector('[data-testid="quienes-pueden"]')).toBeNull();
  });

  it('el segundo factor se confirma AQUÍ y vuelve a pedir la MISMA acción como mensaje de la persona', async () => {
    supabase.auth.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] } });
    supabase.auth.mfa.challenge.mockResolvedValue({ data: { id: 'reto-1' }, error: null });
    supabase.auth.mfa.verify.mockResolvedValue({ data: {}, error: null });
    const antes = window.location.href;
    pintar(mensaje(errorDePermiso(true), { content: 'No se pudo.' }));
    await act(async () => boton('Confirmar mi segundo factor')!.click());
    await flush();
    expect(container.querySelector('[data-testid="segundo-factor"]')!.textContent).toContain(
      'Código de tu app de autenticación',
    );
    await escribirCodigo('123456');
    await flush();
    expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'f-1' });
    expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({ factorId: 'f-1', challengeId: 'reto-1', code: '123456' });
    expect(auth.setMfaVerified).toHaveBeenCalled();
    expect(contexto.sendMessage).toHaveBeenCalledWith('Reintentar: Registrar el pago', {
      intencion: {
        accion: 'registrar_pago',
        entidad: { tipo: 'contrato', id: CONTRATO_24 },
        datos: { valor: 1_550_000, medio: 'transferencia' },
      },
    });
    // Nunca la pantalla del segundo factor: seguimos en el chat.
    expect(window.location.href).toBe(antes);
    expect(boton('Confirmar mi segundo factor')).toBeUndefined();
  });

  it('un código malo lo dice y no reintenta nada', async () => {
    supabase.auth.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] } });
    supabase.auth.mfa.challenge.mockResolvedValue({ data: { id: 'reto-1' }, error: null });
    supabase.auth.mfa.verify.mockResolvedValue({ data: null, error: new Error('Invalid TOTP code entered') });
    pintar(mensaje(errorDePermiso(true), { content: 'No se pudo.' }));
    await act(async () => boton('Confirmar mi segundo factor')!.click());
    await flush();
    await escribirCodigo('000000');
    await flush();
    expect(container.querySelector('[data-testid="segundo-factor"] [role="alert"]')!.textContent).toBe(
      'Ese código no era. Prueba con el siguiente.',
    );
    expect(contexto.sendMessage).not.toHaveBeenCalled();
  });

  it('sin segundo factor inscrito lo dice, sin casillas que no sirven', async () => {
    supabase.auth.mfa.listFactors.mockResolvedValue({ data: { totp: [] } });
    pintar(mensaje(errorDePermiso(true), { content: 'No se pudo.' }));
    await act(async () => boton('Confirmar mi segundo factor')!.click());
    await flush();
    const f = container.querySelector('[data-testid="segundo-factor"]')!;
    expect(f.textContent).toBe('Todavía no tienes el segundo factor activado en tu cuenta.');
    expect(f.querySelector('input')).toBeNull();
  });
});

void React;
