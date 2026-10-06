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
import { filasDeLosPasos } from './turn-steps';
import type { TurnStep } from '@/lib/types/beta-chat';
import { leerElTurno } from '@/lib/agentes/agente-que-habla';

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
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Pensando cómo contestarte…');
  });

  it('un paso terminado colapsa a una línea: su detalle queda en el title, no a la vista', () => {
    pintar(<AgentTaskThread steps={PASOS} />);
    const hecho = container.querySelector('li[data-estado="done"]')!;
    expect(hecho.textContent).toBe('Revisar tu cartera');
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
    // El avance en palabras (02-10): «Paso 2 de 3», el que corre.
    expect(encabezado.textContent).toContain('Paso 2 de 3');
  });
});

// ── El equipo en los pasos (02-10, commit `27a3b2b8`) ───────────────────────
const PASOS_EQUIPO: TurnStep[] = [
  { id: 'entender', kind: 'entender', labelKey: 'beta.tasks.plan.understand', status: 'done' },
  {
    id: 'ag-1',
    kind: 'agente',
    labelKey: 'beta.tasks.plan.consultAgent',
    agentType: 'cobranza',
    detail: 'Listar quién debe más de 30 días',
    actividad: 'Calculando la mora de 31 contratos…',
    status: 'running',
  },
  { id: 'tool-listar-0', kind: 'herramienta', label: 'Listó los contratos con saldo vencido', agentType: 'cobranza', status: 'done' },
  { id: 'redactar', kind: 'redactar', labelKey: 'beta.tasks.plan.write', status: 'pending' },
];

describe('el especialista es una delegación del orquestador (02-10)', () => {
  const turno = leerElTurno({ mensaje: null, pasos: PASOS_EQUIPO, enCurso: true });

  it('el paso del especialista dice «Ori → Laura», con su orbe y lo que hace ahora', () => {
    pintar(<AgentTaskThread steps={PASOS_EQUIPO} turno={turno} />);
    const fila = container.querySelector('[data-testid="paso-delegacion"]')!;
    expect(fila.getAttribute('data-agente')).toBe('cobranza');
    expect(fila.textContent).toContain('Ori');
    expect(fila.textContent).toContain('Laura');
    expect(fila.querySelector('[data-agente="cobranza"][data-estado="trabajando"]')).not.toBeNull();
    expect(fila.querySelector('[aria-live="polite"]')!.textContent).toBe('Calculando la mora de 31 contratos…');
  });

  it('las herramientas van DENTRO de su especialista («Lo que hizo»), no sueltas en la lista', () => {
    pintar(<AgentTaskThread steps={PASOS_EQUIPO} turno={turno} />);
    const filas = [...container.querySelectorAll('ul > li[data-estado]')].filter((li) => li.parentElement?.closest('li') === null);
    expect(filas.map((li) => li.getAttribute('data-estado'))).toEqual(['done', 'running']);
    const fila = container.querySelector('[data-testid="paso-delegacion"]')!;
    expect(fila.textContent).toContain('Lo que hizo · 1');
    expect(fila.textContent).toContain('Listó los contratos con saldo vencido');
  });

  it('el avance no cuenta las herramientas: «Paso 2 de 3»', () => {
    pintar(<AgentTaskThread steps={PASOS_EQUIPO} turno={turno} />);
    expect(container.textContent).toContain('Paso 2 de 3');
    // El encabezado dice lo que hace AHORA y a quién se lo pidió.
    expect(container.querySelector('button[aria-expanded]')!.textContent).toContain('Calculando la mora de 31 contratos…');
    expect(container.textContent).toContain('Ori le pidió a Laura');
  });

  it('al terminar, la delegación muestra lo que CONTESTÓ el especialista', () => {
    const cerrados: TurnStep[] = PASOS_EQUIPO.map((p) =>
      p.id === 'ag-1' ? { ...p, status: 'done', actividad: undefined, detail: '7 inquilinos deben más de 30 días.' } : p
    );
    const t = leerElTurno({ mensaje: null, pasos: cerrados, enCurso: true });
    pintar(<AgentTaskThread steps={cerrados} turno={t} />);
    expect(container.querySelector('[data-testid="paso-delegacion"]')!.textContent).toContain('7 inquilinos deben más de 30 días.');
  });

  it('sin lectura del turno, la lista es la de siempre', () => {
    expect(filasDeLosPasos(PASOS_EQUIPO).map((f) => [f.step.id, !!f.delegacion])).toEqual([
      ['entender', false],
      ['ag-1', false],
      ['tool-listar-0', false],
      ['redactar', false],
    ]);
    expect(filasDeLosPasos(PASOS_EQUIPO, turno).map((f) => [f.step.id, !!f.delegacion])).toEqual([
      ['entender', false],
      ['ag-1', true],
      ['redactar', false],
    ]);
  });

  it('la franja del compositor lleva el orbe de quien trabaja', () => {
    pintar(<AgentTaskProgress steps={PASOS_EQUIPO} turno={turno} />);
    expect(container.querySelector('[data-testid="franja-del-turno"] [data-agente="cobranza"]')).not.toBeNull();
  });
});

