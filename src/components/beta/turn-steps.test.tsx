/**
 * @vitest-environment happy-dom
 */
/**
 * Los pasos del turno, en el hilo y en el panel del compositor.
 *
 * Nico, 23-09, con capturas del chat del panel: la lista «se queda ahí sólo con
 * un texto y sin cargas, no se sabe si sí está funcionando», y del reloj de la
 * derecha («0:06»): «no tiene sentido dejarlo ahí».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
// El orbe monta WebGL: fuera de la prueba de comportamiento.
vi.mock('./ChatOrb', () => ({ ChatOrb: () => null }));

import { AgentTaskThread } from './AgentTaskThread';
import { AgentTaskProgress } from './AgentTaskProgress';
import type { TurnStep } from '@/lib/types/beta-chat';

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
});

function pintar(el: React.ReactElement) {
  act(() => root.render(el));
}

const hace = (s: number) => new Date(Date.now() - s * 1000);

const PASOS: TurnStep[] = [
  {
    id: 'cartera',
    kind: 'cartera',
    labelKey: 'beta.tasks.plan.snapshot',
    detailKey: 'beta.tasks.detail.carteraErp',
    detailVars: { cartera: '$ 12.500.000', contratos: 7 },
    status: 'done',
    startedAt: hace(40),
    completedAt: hace(37),
  },
  {
    id: 'ag-1',
    kind: 'agente',
    labelKey: 'beta.tasks.plan.consultAgent',
    agentType: 'reportes' as TurnStep['agentType'],
    detail: 'Contar los contratos que vencen en octubre y cruzarlos con los activos',
    actividad: 'Leyendo los 29 contratos de octubre…',
    status: 'running',
    startedAt: hace(6),
  },
  { id: 'redactar', kind: 'redactar', labelKey: 'beta.tasks.plan.write', status: 'pending' },
];

describe('los pasos del turno (Nico, 23-09)', () => {
  it('sin reloj a la derecha: ni en el hilo ni en el panel del compositor', () => {
    pintar(
      <>
        <AgentTaskThread steps={PASOS} />
        <AgentTaskProgress steps={PASOS} />
      </>
    );
    // Se abre el panel para ver todas sus filas.
    act(() => container.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click());
    expect(container.textContent).not.toMatch(/\d:\d{2}/);
  });

  it('el paso activo gira con el indicador de Cadence y dice, en presente, qué está haciendo', () => {
    pintar(<AgentTaskThread steps={PASOS} />);
    const activo = container.querySelector('li[data-estado="running"]')!;
    expect(activo.querySelector('[data-testid="paso-girando"]')).not.toBeNull();
    // Se anuncia a un lector de pantalla cada vez que cambia.
    const linea = activo.querySelector('[aria-live="polite"]')!;
    expect(linea.textContent).toBe('Leyendo los 29 contratos de octubre…');
  });

  it('un paso activo sin aviso del micro igual dice qué hace (nunca una línea muda)', () => {
    pintar(
      <AgentTaskThread
        steps={[{ id: 'entender', kind: 'entender', labelKey: 'beta.tasks.plan.understand', status: 'running' }]}
      />
    );
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Decidiendo cómo resolverla…');
  });

  it('un paso terminado colapsa a una línea: su detalle queda en el title, no a la vista', () => {
    pintar(<AgentTaskThread steps={PASOS} />);
    const hecho = container.querySelector('li[data-estado="done"]')!;
    expect(hecho.textContent).toBe('Revisar el estado de tu cartera');
    expect(hecho.querySelector('[title]')!.getAttribute('title')).toContain('Cartera por cobrar: $ 12.500.000 en 7 contratos');
    expect(container.textContent).not.toContain('Sin datos de cartera');
  });

  it('un paso fallido sí deja el porqué a la vista', () => {
    pintar(
      <AgentTaskThread
        steps={[
          {
            id: 'ag-2',
            kind: 'agente',
            label: 'Consultar al especialista de Pagos',
            detail: 'El especialista no respondió a tiempo',
            status: 'failed',
          },
        ]}
      />
    );
    expect(container.textContent).toContain('El especialista no respondió a tiempo');
  });

  it('el sub-avance se dibuja como barra sólo cuando hay un total', () => {
    const conTotal: TurnStep = { ...PASOS[1], avance: { hechos: 12, total: 29 } };
    pintar(<AgentTaskThread steps={[conTotal]} />);
    const barra = container.querySelector('[role="progressbar"]')!;
    expect(barra.getAttribute('aria-label')).toBe('12 de 29');
    pintar(<AgentTaskThread steps={[PASOS[1]]} />);
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('el encabezado del panel del compositor dice lo que se está haciendo ahora', () => {
    pintar(<AgentTaskProgress steps={PASOS} />);
    const encabezado = container.querySelector('button[aria-expanded]')!;
    expect(encabezado.textContent).toContain('Leyendo los 29 contratos de octubre…');
    expect(encabezado.textContent).toContain('1 / 3');
  });
});
