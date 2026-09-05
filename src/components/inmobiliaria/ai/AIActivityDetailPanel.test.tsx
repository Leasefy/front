/**
 * AIActivityDetailPanel — el «Trace de ejecución» era una obra de ficción.
 *
 * Lo que había: `buildTrace()` inventaba los pasos de la ejecución según el
 * `type` de la actividad —etiqueta, estado, duración y salida, todo escrito a
 * mano en el front—. Uno de esos renglones le decía a la inmobiliaria cuántas
 * propiedades había analizado el agente:
 *
 *     `${Math.floor(Math.random() * 30 + 15)} propiedades disponibles analizadas`
 *
 * y el «X.Xs total» del encabezado se calculaba sumando las duraciones
 * quemadas («2.1s», «0.2s»…), mientras `metadata.durationMs` —la duración de
 * verdad, que sí viene del back— no se usaba en ninguna parte.
 *
 * `GET /inmobiliaria/ai/activity` devuelve el desenlace, no el camino: no hay
 * traza por pasos en el contrato. Así que la pantalla muestra lo que llegó y
 * dice que del paso a paso no hay registro.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: () => {}, start: () => {} }),
}));

import { AIActivityDetailPanel } from './AIActivityDetailPanel';
import type { AgentActivity } from '@/lib/types/ai-agents';

void React;

/** La rama que traía el `Math.random()`: ejecución de un agente no-scoring. */
const MATCHING: AgentActivity = {
  id: 'act-1',
  agentId: 'smart-matching',
  agentName: 'Matching Inteligente',
  type: 'execution',
  title: '1 propiedad compatible encontrada',
  description: 'Estudio loft en Usaquén — 60% compatible',
  status: 'success',
  timestamp: new Date('2026-09-03T12:00:00.000Z'),
  metadata: { applicationId: 'app-1', durationMs: 3400 },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function pintar(activity: AgentActivity) {
  act(() => {
    root.render(<AIActivityDetailPanel activity={activity} onClose={() => {}} />);
  });
}

/** El panel monta en un portal sobre document.body. */
const texto = () => document.body.textContent ?? '';
const q = (sel: string) => document.body.querySelector(sel);

describe('<AIActivityDetailPanel>', () => {
  it('no afirma cuántas propiedades analizó el agente', () => {
    pintar(MATCHING);
    expect(texto()).not.toMatch(/propiedades disponibles analizadas/);
  });

  it('con la misma actividad, dos aperturas dicen exactamente lo mismo', () => {
    // ⛔ La que muerde el `Math.random()`.
    pintar(MATCHING);
    const primero = texto();

    act(() => root.unmount());
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    pintar(MATCHING);
    expect(texto()).toBe(primero);
  });

  it('la duración sale de metadata.durationMs, no de una suma de pasos inventados', () => {
    pintar(MATCHING);
    // 3400 ms → «3.4s». La suma vieja de esa rama daba 4.0s.
    expect(q('[data-testid="actividad-duracion"]')?.textContent).toContain('3.4s');
  });

  it('sin durationMs no muestra duración, en vez de decir 0.0s', () => {
    pintar({ ...MATCHING, metadata: { applicationId: 'app-1' } });
    expect(q('[data-testid="actividad-duracion"]')).toBeNull();
    // El código viejo igual escribía «4.0s total» acá: la suma de duraciones
    // quemadas no depende de que la ejecución haya medido algo.
    expect(texto()).not.toContain('s total');
  });

  it('dice que el paso a paso no se guarda, en vez de dibujar pasos', () => {
    pintar(MATCHING);
    expect(q('[data-testid="actividad-sin-paso-a-paso"]')?.textContent).toContain(
      'no se guarda',
    );
    expect(texto()).not.toContain('Trace de ejecución');
    expect(texto()).not.toContain('Extraer datos con OCR');
  });

  it('muestra el resultado que mandó el agente, sin adornarlo', () => {
    pintar(MATCHING);
    expect(q('[data-testid="actividad-resultado"]')?.textContent).toContain(
      'Estudio loft en Usaquén — 60% compatible',
    );
  });

  it('en una escalación, «Qué pasó» es lo que dijo el agente y no un guion', () => {
    pintar({
      ...MATCHING,
      agentId: 'tenant-scoring',
      type: 'escalation',
      title: 'Escalado a revisión humana',
      description: 'Confianza del modelo por debajo del umbral',
      status: 'failed',
      metadata: { applicationId: 'app-1', durationMs: 1200 },
    });

    expect(texto()).toContain('Confianza del modelo por debajo del umbral');
    // El guion viejo afirmaba un hallazgo concreto que nadie verificó acá.
    expect(texto()).not.toContain('no coinciden con los movimientos de los extractos');
  });
});
