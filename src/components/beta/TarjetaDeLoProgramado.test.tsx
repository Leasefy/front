/** La tarjeta de lo programado en el chat de Ori (29-10): «¿qué tengo programado?». */
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
import { leerTarjetaDeLoProgramado, type TarjetaDeLoProgramado } from '@/lib/chat/programado-del-chat';
import { componenteDelMicro, erroresContraElEsquema } from '@/lib/api/contrato-del-chat-del-micro';

/** Como la arma el micro (`programado/en-el-chat.ts`, `tarjetaDeLoProgramado`). */
function programada(n: number, estado: 'activa' | 'pausada' | 'terminada' = 'activa', extra: Record<string, unknown> = {}) {
  const cual = `lo programado: cada día ${n}, mándale el recordatorio a los que deben`;
  return {
    id: `prog-${n}`,
    cuando: `cada día ${n} a las 8:00 a. m.`,
    que: 'mándale el recordatorio a los que deben',
    estado,
    proxima: estado === 'activa' ? '2026-11-05T13:00:00.000Z' : null,
    proximaDicha: estado === 'activa' ? 'la próxima: jueves 5 de noviembre a las 8:00 a. m.' : 'en pausa',
    ultimoDisparo: null,
    esperaClic: null,
    botones: [
      { tipo: 'hacer_ahora', etiqueta: 'Hacer ahora', mensaje: 'mándale el recordatorio a los que deben' },
      estado === 'activa' ? { tipo: 'pausar', etiqueta: 'Pausar', mensaje: `Pausa ${cual}` } : { tipo: 'reanudar', etiqueta: 'Reanudar', mensaje: `Reanuda ${cual}` },
      { tipo: 'cancelar', etiqueta: 'Cancelar', mensaje: `Cancela ${cual}` },
    ],
    ...extra,
  };
}
const tarjeta = (programadas: unknown[]) => ({ programadas, hayListas: programadas.some((p) => (p as { esperaClic: unknown }).esperaClic) });

function mensaje(t: unknown): ChatMessage {
  return { id: 'a-1', role: 'assistant', content: 'Tienes 2 órdenes programadas.', timestamp: new Date(), status: 'complete', turnoId: 't-1', programado: leerTarjetaDeLoProgramado(t) as TarjetaDeLoProgramado };
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  contexto.sendMessage.mockReset();
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
});
const pintar = (m: ChatMessage, posteriores: ChatMessage[] = []) => {
  contexto.messages = [m, ...posteriores];
  act(() => root.render(<AccionesEnElHilo message={m} />));
};
const q = (s: string) => container.querySelectorAll(`[data-testid="${s}"]`);

describe('la tarjeta de lo programado en el chat (29-10)', () => {
  it('cada orden con su cuándo, su estado con palabra, la próxima vez y lo que espera el clic', () => {
    const lista = programada(6, 'activa', { esperaClic: { desde: '2026-10-29T13:00:00.000Z', texto: 'Mandar el recordatorio a 12 inquilinos' }, ultimoDisparo: { en: '2026-10-29T13:00:00.000Z', detalle: 'Quedó lista: 12 deben.' } })
    pintar(mensaje(tarjeta([programada(5, 'pausada'), lista])));
    expect(q('tarjeta-de-lo-programado')).toHaveLength(1);
    const filas = q('programada');
    expect(filas).toHaveLength(2);
    expect(filas[0]!.getAttribute('data-estado')).toBe('pausada');
    expect(filas[0]!.textContent).toContain('cada día 5 a las 8:00 a. m.');
    expect(filas[0]!.textContent).toContain('En pausa');
    expect(filas[1]!.querySelector('[data-testid="proxima"]')!.textContent).toBe('La próxima: jueves 5 de noviembre a las 8:00 a. m.');
    expect(filas[1]!.querySelector('[data-testid="espera-clic"]')!.textContent).toContain('Mandar el recordatorio a 12 inquilinos');
    expect(filas[1]!.querySelector('[data-testid="ultimo-disparo"]')!.textContent).toContain('Quedó lista: 12 deben.');
    expect(filas[0]!.querySelector('[data-testid="ultimo-disparo"]')!.textContent).toBeTruthy();
  });

  it('los botones son MENSAJES del hilo: mandan la frase tal cual, sin intención ni navegación', () => {
    pintar(mensaje(tarjeta([programada(5)])));
    act(() => (q('programado-pausar')[0] as HTMLButtonElement).click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Pausa lo programado: cada día 5, mándale el recordatorio a los que deben');
    act(() => (q('programado-hacer_ahora')[0] as HTMLButtonElement).click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('mándale el recordatorio a los que deben');
  });

  it('una lista de antes (la persona ya escribió otra cosa) apaga los botones y dice cómo verla al día', () => {
    const m = mensaje(tarjeta([programada(5)]));
    pintar(m, [{ id: 'u-2', role: 'user', content: 'hola', timestamp: new Date(), status: 'complete' } as ChatMessage]);
    expect((q('programado-cancelar')[0] as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toMatch(/¿qué tengo programado\?/);
  });

  it('más de 5: se ven 5 y el resto se pliega, sin scroll propio', () => {
    pintar(mensaje(tarjeta(Array.from({ length: 8 }, (_, i) => programada(i + 1)))));
    expect(container.textContent).toMatch(/8/);
  });

  it('lo que no se entiende se descarta; el `done` del micro cumple el esquema', () => {
    expect(leerTarjetaDeLoProgramado({ programadas: [{ id: 'x' }] })).toBeNull();
    expect(leerTarjetaDeLoProgramado(null)).toBeNull();
    const esquema = componenteDelMicro('AiHubChatPiezasNuevasDelDone')!.properties!.programado;
    expect(erroresContraElEsquema(esquema, tarjeta([programada(5), programada(6, 'pausada')]), 'programado')).toEqual([]);
    expect(erroresContraElEsquema(esquema, { ...tarjeta([programada(5)]), inventada: 1 }, 'programado')).not.toEqual([]);
  });
});
