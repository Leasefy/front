/**
 * @vitest-environment happy-dom
 */
/**
 * La tarjeta LOTE en el hilo (29-10-2026): la misma acción para varios, con
 * UNA confirmación y el avance en segundo plano. Se pinta a través de
 * `AccionesEnElHilo`, como en el chat de verdad, con la forma que manda el
 * micro (`AiHubChatTarjetaLote`). Vigila:
 *   · la lista con las primeras a la vista y el resto plegado DENTRO de la
 *     caja; quitar a alguno y escoger entre homónimos antes de confirmar;
 *   · cada botón es un MENSAJE DE LA PERSONA con la intención que trajo la
 *     tarjeta (y lo que la persona decidió); ninguno navega ni se inventa;
 *   · mientras corre, la tarjeta pide su avance sola; al final, el resumen y
 *     «Reintentar los que fallaron».
 */

import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    sendMessage: vi.fn(),
    anotarTarjetaAbierta: vi.fn(),
    refrescarEjecucion: vi.fn(),
    refrescarLote: vi.fn(),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
    messages: [] as unknown[],
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));
vi.mock('@/lib/api/procesos.service', () => ({ procesosApi: { ver: vi.fn(), cancelar: vi.fn() }, RECURSO_DE_PROCESOS: 'procesos' }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ setMfaVerified: vi.fn() }) }));

import { AccionesEnElHilo } from './AccionesEnElHilo';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { leerTarjetaDeLote, type TarjetaDeLote } from '@/lib/chat/lote-del-chat';
import { leerIntencion } from '@/lib/chat/acciones-del-hilo';
import { componenteDelMicro, erroresContraElEsquema } from '@/lib/api/contrato-del-chat-del-micro';

const LOTE = '00000000-0000-4000-a000-000000000007';
const RIESGO = { muevePlata: false, escribeATerceros: true, irreversible: false, masiva: true, fiscal: false, dobleControl: null, proceso: false, tope: null, agenteDueno: 'cobranza' };
const boton = (etiqueta: string, accion: string) => ({ etiqueta, intencion: { accion, loteId: LOTE } });

function item(n: number, estado = 'listo', extra: Record<string, unknown> = {}) {
  return { n, etiqueta: `Inquilino ${n} · contrato #${n}`, detalle: `Debe $ ${n}00.000`, accion: 'mandar_recordatorio_de_pago', estado, resumen: null, quitable: estado === 'listo', revisado: true, ...extra };
}

/** La tarjeta tal como la manda el micro (`tarjetaDelLote`). */
function lote(estado: string, extra: Record<string, unknown> = {}) {
  const items = (extra.items as unknown[]) ?? Array.from({ length: 9 }, (_, i) => item(i + 1));
  return {
    tipo: 'lote',
    loteId: LOTE,
    titulo: 'Recordar el pago a 9 inquilinos que deben $ 4.500.000',
    cita: 'cóbrale a los que deben más de 2 meses',
    verbo: 'Recordar el pago',
    descripcion: 'los inquilinos que deben más de 2 meses',
    estado,
    modo: 'copiloto',
    pregunta: '¿Lo hago?',
    porQue: 'Son 9 inquilinos en una sola confirmación: revísalos y quita a quien no deba ir. A cada uno le llega un mensaje.',
    venceEn: new Date(Date.now() + 30 * 60_000).toISOString(),
    riesgo: RIESGO,
    cifra: 4_500_000,
    items,
    noEntran: [{ porQue: 'El contrato no está en mora: no hay deuda que cobrar.', cuantos: 2, quienes: ['Ana · contrato #20', 'Luis · contrato #30'] }],
    porResolver: [
      {
        nombre: 'Ana Gomez',
        motivo: 'ambiguo',
        opciones: [
          { etiqueta: 'Ana Gómez Restrepo', detalle: 'Inquilino · contrato #2', entidad: { tipo: 'persona', id: 'p-ana-1' } },
          { etiqueta: 'Ana Gómez Uribe', detalle: 'Inquilino · contrato #3', entidad: { tipo: 'persona', id: 'p-ana-2' } },
        ],
      },
      { nombre: 'Pedro Ruiz', motivo: 'no_aparece', opciones: [] },
    ],
    quedan: 0,
    tope: 500,
    progreso: { total: items.length, hechos: 0, fallidos: 0, omitidos: 0, pendientes: items.length, quitados: 0 },
    espera: null,
    resumen: null,
    fallas: [],
    campos: [],
    hacer: estado === 'propuesto' ? boton('Sí, hazlo', 'hacer_lote') : null,
    cancelar: estado === 'propuesto' ? boton('No', 'cancelar_lote') : estado === 'ejecutando' ? boton('Detener', 'cancelar_lote') : null,
    reintentar: null,
    seguir: null,
    ensayo: false,
    ...extra,
  };
}

function mensaje(l: unknown, parcial: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'a-1', role: 'assistant', content: 'Armé el lote.', timestamp: new Date(), status: 'complete', turnoId: 't-1', lote: leerTarjetaDeLote(l) as TarjetaDeLote, ...parcial };
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  contexto.sendMessage.mockReset();
  contexto.refrescarLote.mockReset().mockResolvedValue(null);
  contexto.messages = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  // 🔴 Todo dentro del chat: ningún enlace; y la caja no tiene scroll propio.
  expect(container.querySelector('a')).toBeNull();
  expect(container.innerHTML).not.toMatch(/overflow-y-(auto|scroll)|max-h-/);
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const pintar = (m: ChatMessage, posteriores: ChatMessage[] = []) => {
  contexto.messages = [m, ...posteriores];
  act(() => root.render(<AccionesEnElHilo message={m} />));
};
const tarjeta = () => container.querySelector<HTMLElement>('[data-testid="tarjeta-de-lote"]')!;
const botonQueDice = (texto: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
const items = () => [...container.querySelectorAll<HTMLElement>('[data-testid="item-del-lote"]')];

describe('el lote propuesto', () => {
  it('UNA caja: el título con la cifra, lo que pediste, el porqué, las primeras 6 y el resto plegado adentro', () => {
    pintar(mensaje(lote('propuesto')));
    expect(container.querySelectorAll('[data-testid="tarjeta-de-lote"]')).toHaveLength(1);
    expect(tarjeta().getAttribute('data-estado')).toBe('propuesto');
    expect(container.querySelector('[data-testid="titulo-del-lote"]')!.textContent).toBe('Recordar el pago a 9 inquilinos que deben $ 4.500.000');
    expect(tarjeta().textContent).toContain('Lo que pediste: «cóbrale a los que deben más de 2 meses»');
    expect(tarjeta().textContent).toContain('¿Lo hago?');
    expect(items()).toHaveLength(6);
    act(() => botonQueDice('Ver los 3 que faltan')!.click());
    expect(items()).toHaveLength(9);
    // Lo que no entra, con su porqué y a quiénes, plegado.
    act(() => botonQueDice('No entran hoy (2): por qué')!.click());
    expect(container.querySelector('[data-testid="no-entran"]')!.textContent).toContain('El contrato no está en mora');
    expect(container.querySelector('[data-testid="no-entran"]')!.textContent).toContain('Ana · contrato #20, Luis · contrato #30');
    // El que no aparece, con su frase.
    expect(container.querySelector('[data-testid="por-resolver"]')!.textContent).toContain('«Pedro Ruiz» no aparece en tu inmobiliaria.');
  });

  it('quitar a uno, escoger a la Ana correcta y «Sí, hazlo con N»: UN mensaje de la persona con lo que decidió', () => {
    pintar(mensaje(lote('propuesto')));
    expect(botonQueDice('Sí, hazlo con 9')).toBeDefined();
    const casilla = items()[1]!.querySelector<HTMLElement>('[role="checkbox"]')!;
    act(() => casilla.click());
    expect(items()[1]!.getAttribute('data-estado')).toBe('quitado');
    const ana = container.querySelector<HTMLElement>('[role="radio"][value="persona:p-ana-2"]')!;
    act(() => ana.click());
    act(() => botonQueDice('Sí, hazlo con 9')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Sí, hazlo con 9', {
      intencion: { accion: 'hacer_lote', loteId: LOTE, quitar: [2], elegidos: [{ i: 0, tipo: 'persona', id: 'p-ana-2' }] },
    });
  });

  it('«No» es secundario y manda `cancelar_lote`; ya respondida, sin botones', () => {
    const m = mensaje(lote('propuesto'));
    pintar(m);
    act(() => botonQueDice('No')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('No, no hagas el lote', { intencion: { accion: 'cancelar_lote', loteId: LOTE } });
    const respuesta: ChatMessage = { id: 'u-2', role: 'user', content: 'Sí, hazlo con 9', timestamp: new Date(), status: 'complete', intencion: { accion: 'hacer_lote', loteId: LOTE } };
    pintar(m, [respuesta]);
    expect(tarjeta().getAttribute('data-estado')).toBe('contestado');
    expect(botonQueDice('Sí, hazlo con 9')).toBeUndefined();
    expect(tarjeta().textContent).toContain('Dijiste que sí: el avance va en la respuesta de abajo.');
  });
});

describe('mientras corre y al final', () => {
  it('corriendo: la barra «N de M», «Detener», y la tarjeta pide su avance sola', async () => {
    vi.useFakeTimers();
    const l = lote('ejecutando', {
      items: [item(1, 'hecho', { resumen: 'Le mandé el recordatorio de pago de octubre de 2026 por correo.' }), item(2, 'en_curso'), item(3, 'pendiente')],
      progreso: { total: 3, hechos: 1, fallidos: 0, omitidos: 0, pendientes: 2, quitados: 0 },
    });
    pintar(mensaje(l));
    expect(container.querySelector('[data-testid="avance-del-lote"]')!.textContent).toContain('1 de 3');
    expect(items().map((i) => i.getAttribute('data-estado'))).toEqual(['hecho', 'en_curso', 'pendiente']);
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(contexto.refrescarLote).toHaveBeenCalledWith('a-1', LOTE);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(contexto.refrescarLote).toHaveBeenCalledTimes(2);
    act(() => botonQueDice('Detener')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Detén el lote', { intencion: { accion: 'cancelar_lote', loteId: LOTE } });
  });

  it('hecho: el resumen, lo que no se pudo (abierto) y «Reintentar los 2 que fallaron»', () => {
    const l = lote('hecho', {
      items: [item(1, 'hecho'), item(2, 'fallido', { resumen: 'El correo rebotó.' }), item(3, 'fallido', { resumen: 'El correo rebotó.' })],
      progreso: { total: 3, hechos: 1, fallidos: 2, omitidos: 0, pendientes: 0, quitados: 0 },
      resumen: 'Hecho con 1 de 3; 2 fallaron (El correo rebotó).',
      fallas: [{ porQue: 'El correo rebotó.', cuantos: 2 }],
      reintentar: boton('Reintentar los 2 que fallaron', 'reintentar_lote'),
      porResolver: [],
      noEntran: [],
    });
    pintar(mensaje(l));
    expect(tarjeta().textContent).toContain('Hecho con 1 de 3; 2 fallaron (El correo rebotó).');
    expect(container.querySelector('[data-testid="fallas-del-lote"]')!.textContent).toContain('2 · El correo rebotó.');
    act(() => botonQueDice('Reintentar los 2 que fallaron')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Reintenta los que fallaron', { intencion: { accion: 'reintentar_lote', loteId: LOTE } });
    expect(contexto.refrescarLote).not.toHaveBeenCalled();
  });
});

describe('lo que llega del micro se lee con cuidado', () => {
  it('los ejemplos son lo que el micro manda (el esquema del snapshot, estricto)', () => {
    const esquema = componenteDelMicro('AiHubChatPiezasNuevasDelDone')!.properties!.lote;
    for (const e of ['propuesto', 'ejecutando', 'hecho', 'programado', 'en_pausa', 'cancelado', 'vencido']) {
      expect(erroresContraElEsquema(esquema, lote(e), 'lote')).toEqual([]);
    }
    expect(erroresContraElEsquema(esquema, { ...lote('propuesto'), inventada: 1 }, 'lote')).not.toEqual([]);
    expect(erroresContraElEsquema(esquema, null, 'lote')).toEqual([]);
  });

  it('un botón de OTRO lote no se pinta; una tarjeta sin id o sin nada que mostrar, tampoco', () => {
    const otro = leerTarjetaDeLote({ ...lote('propuesto'), hacer: { etiqueta: 'Sí', intencion: { accion: 'hacer_lote', loteId: 'otro' } } })!;
    expect(otro.hacer).toBeNull();
    expect(leerTarjetaDeLote({ ...lote('propuesto'), loteId: '' })).toBeNull();
    expect(leerTarjetaDeLote({ ...lote('propuesto'), items: [], porResolver: [] })).toBeNull();
    expect(leerTarjetaDeLote({ ...lote('raro') })).toBeNull();
  });

  it('la intención del lote guarda sólo lo que el micro acepta', () => {
    expect(leerIntencion({ accion: 'hacer_lote', loteId: LOTE, quitar: [2, 'x', -1], elegidos: [{ i: 0, tipo: 'persona', id: 'p' }, { i: 'x' }], datos: { motivo: 'mora', 'mal clave': 1 } })).toEqual({
      accion: 'hacer_lote',
      loteId: LOTE,
      quitar: [2],
      elegidos: [{ i: 0, tipo: 'persona', id: 'p' }],
      datos: { motivo: 'mora' },
    });
    expect(leerIntencion({ accion: 'reintentar_lote' })).toBeNull();
  });
});
