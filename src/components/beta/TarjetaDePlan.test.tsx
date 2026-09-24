/**
 * @vitest-environment happy-dom
 */
/**
 * La tarjeta PLAN en el hilo (24-09, paquete H): varias acciones pedidas en
 * una frase, con UNA confirmación.
 *
 * Se pinta a través de `AccionesEnElHilo`, como en el chat de verdad, con los
 * planes TAL COMO LOS MANDA EL MICRO (`plan-del-chat.fixtures`, validados
 * contra su esquema en `plan-del-chat.test.ts`). Vigila:
 *   · la lista numerada con el riesgo de cada paso (ícono + palabra) y UN
 *     solo «Hacer todo», que no se deja tocar con datos a medias;
 *   · cada botón es un MENSAJE DE LA PERSONA con la intención que trajo la
 *     tarjeta (y lo llenado en `datos`); ninguno navega ni se inventa;
 *   · después: el avance, «Deshacer» del paso hecho y «Reintentar desde aquí»;
 *   · lo secundario, en outline; una sola caja, sin scroll propio.
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
import { leerTarjetaDePlan, type TarjetaDePlan } from '@/lib/chat/plan-del-chat';
import { EJECUCION_DEL_PASO_1, PLAN, planDetenido, planPropuesto, planQueSeDetieneAntes } from '@/lib/chat/plan-del-chat.fixtures';

function mensaje(plan: unknown, parcial: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'a-1',
    role: 'assistant',
    content: 'Armé un plan de 2 pasos con lo que pediste. Revísalo antes de que lo haga:',
    timestamp: new Date(),
    status: 'complete',
    turnoId: 't-1',
    plan: leerTarjetaDePlan(plan) as TarjetaDePlan,
    ...parcial,
  };
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
const tarjeta = () => container.querySelector<HTMLElement>('[data-testid="tarjeta-de-plan"]')!;
const boton = (texto: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
const esOutline = (b: HTMLElement) => b.className.includes('bg-transparent') && b.className.includes('border-border');
const pasos = () => [...container.querySelectorAll<HTMLElement>('[data-testid="paso-del-plan"]')];

describe('el plan propuesto', () => {
  it('la lista numerada, el riesgo de cada paso con su palabra, lo que pediste y UNA caja', () => {
    pintar(mensaje(planPropuesto()));
    expect(container.querySelectorAll('[data-testid="tarjeta-de-plan"]')).toHaveLength(1);
    expect(tarjeta().getAttribute('data-estado')).toBe('propuesto');
    expect(tarjeta().textContent).toContain('Espera tu respuesta');
    expect(tarjeta().textContent).toContain('Lo que pediste: «regístrale un pago de 500 mil al contrato 24');
    expect(container.querySelector('ol')).not.toBeNull();
    expect(pasos().map((p) => p.textContent?.includes('Pendiente'))).toEqual([true, true]);
    const riesgos = [...container.querySelectorAll('[data-riesgo]')].map((r) => r.getAttribute('data-riesgo'));
    expect(riesgos).toEqual(['plata', 'terceros']);
    expect(tarjeta().textContent).toContain('¿Hago todo?');
  });

  it('«Hacer todo» no se deja tocar hasta llenar lo que falta; con eso, UN mensaje de la persona con la intención y los datos', () => {
    pintar(mensaje(planPropuesto()));
    const hacer = boton('Hacer todo')!;
    expect(hacer.disabled).toBe(true);
    expect(tarjeta().textContent).toContain('Llena lo que falta en los pasos para poder hacerlo todo.');
    const fecha = container.querySelector<HTMLInputElement>('input[type="date"]')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(fecha, '2026-09-24');
      fecha.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(boton('Hacer todo')!.disabled).toBe(false);
    act(() => boton('Hacer todo')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Sí, hazlo todo', {
      intencion: { accion: 'hacer_plan', planId: PLAN, datos: { p1_fecha: '2026-09-24' } },
    });
  });

  it('«No» es secundario (outline) y manda `cancelar_plan`', () => {
    pintar(mensaje(planPropuesto()));
    const no = boton('No')!;
    expect(esOutline(no)).toBe(true);
    expect(esOutline(boton('Hacer todo')!)).toBe(false);
    act(() => no.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('No, no hagas el plan', { intencion: { accion: 'cancelar_plan', planId: PLAN } });
  });

  it('ya respondida (la persona dijo que sí en el hilo): sin botones, dice que el avance va abajo', () => {
    const respuesta: ChatMessage = {
      id: 'u-2',
      role: 'user',
      content: 'Sí, hazlo todo',
      timestamp: new Date(),
      status: 'complete',
      intencion: { accion: 'hacer_plan', planId: PLAN },
    };
    pintar(mensaje(planPropuesto()), [respuesta]);
    expect(boton('Hacer todo')).toBeUndefined();
    expect(tarjeta().getAttribute('data-estado')).toBe('contestado');
    expect(tarjeta().textContent).toContain('Dijiste que sí: el avance va en la respuesta de abajo.');
    expect(container.querySelector('[data-testid="datos-del-paso"]')).toBeNull();
  });

  it('lo que el chat todavía no sabe hacer: el plan lo dice y se detiene antes', () => {
    pintar(mensaje(planQueSeDetieneAntes()));
    const nota = container.querySelector('[data-testid="se-detiene-antes"]')!;
    expect(nota.textContent).toContain('El plan se detiene antes del paso 2 (crear el contrato con el PDF que se acaba de generar):');
    expect(nota.textContent).toContain('todavía no lo puedo hacer desde el chat');
    expect(pasos()).toHaveLength(1);
  });

  it('en ENSAYO: completo, marcado, y sin ningún botón', () => {
    const p = { ...planPropuesto(), ensayo: true, hacerTodo: null, cancelar: null };
    pintar(mensaje(p, { ensayo: true }));
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(tarjeta().textContent).toContain('Ensayo: el plan está completo, pero nada se guarda ni se ejecuta.');
  });
});

describe('el plan después de «Hacer todo»', () => {
  it('el avance paso a paso, «Deshacer» del paso hecho y «Reintentar desde el paso 2»', () => {
    pintar(mensaje(planDetenido()));
    expect(tarjeta().getAttribute('data-estado')).toBe('detenido');
    expect(pasos().map((p) => p.getAttribute('data-estado'))).toEqual(['hecho', 'fallido']);
    expect(pasos()[1]!.textContent).toContain('El inquilino no tiene correo registrado.');
    expect(container.querySelector('[data-testid="plan-detenido"]')!.textContent).toContain('Se detuvo en el paso 2:');

    const deshacer = boton('Anular el recibo')!;
    expect(esOutline(deshacer)).toBe(true);
    act(() => deshacer.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('Anular el recibo', {
      intencion: { accion: 'deshacer', propuestaId: EJECUCION_DEL_PASO_1 },
    });

    act(() => boton('Reintentar desde el paso 2')!.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('Sigue desde el paso 2', { intencion: { accion: 'seguir_plan', planId: PLAN } });
    expect(esOutline(boton('No seguir')!)).toBe(true);
  });

  it('un «Deshacer» ya pedido no se vuelve a ofrecer', () => {
    const pedido: ChatMessage = {
      id: 'u-3',
      role: 'user',
      content: 'Anular el recibo',
      timestamp: new Date(),
      status: 'complete',
      intencion: { accion: 'deshacer', propuestaId: EJECUCION_DEL_PASO_1 },
    };
    pintar(mensaje(planDetenido()), [pedido]);
    expect(boton('Anular el recibo')).toBeUndefined();
    expect(pasos()[0]!.textContent).toContain('Pediste deshacerlo: la respuesta va abajo.');
  });

  it('sin «seguir» en la tarjeta (el doble control le toca a otra persona) no aparece ningún «Reintentar»', () => {
    const p = { ...planDetenido(), seguir: null, detenido: { n: 2, tipo: 'doble_control', porQue: 'La aprobación la tiene que dar otra persona.' } };
    pintar(mensaje(p));
    expect([...container.querySelectorAll('button')].some((b) => /Reintentar|Seguir/.test(b.textContent ?? ''))).toBe(false);
    expect(tarjeta().textContent).toContain('La aprobación la tiene que dar otra persona.');
  });
});
