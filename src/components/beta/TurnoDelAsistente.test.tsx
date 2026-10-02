/**
 * @vitest-environment happy-dom
 */
/**
 * La respuesta del asistente con su equipo (02-10-2026): el orbe del
 * orquestador arriba de cada respuesta y la delegación en una línea que se
 * abre en el detalle de cada especialista.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CabeceraDeLaRespuesta, ResumenDelTurno } from './TurnoDelAsistente';
import { RazonamientoDelTurno } from '@/components/agentes/TurnoDelEquipo';
import { leerElTurno } from '@/lib/agentes/agente-que-habla';
import type { ChatMessage } from '@/lib/types/beta-chat';

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
const pintar = (el: React.ReactElement) => act(() => root.render(el));

const t0 = new Date('2026-10-02T09:00:00-05:00');
const respuesta = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'a-1',
  role: 'assistant',
  content: 'Hoy 7 inquilinos deben más de 30 días.',
  timestamp: t0,
  status: 'complete',
  agentActivity: {
    id: 'b-1',
    messageId: 'a-1',
    startedAt: t0,
    agents: [
      {
        id: 'e-1',
        agentType: 'cobranza',
        taskDescription: 'Listar quién debe más de 30 días',
        status: 'completed',
        startedAt: t0,
        resumen: '7 inquilinos deben más de 30 días.',
      },
      {
        id: 'e-2',
        agentType: 'pagos',
        taskDescription: 'Ver si hay pagos sin conciliar',
        status: 'failed',
        startedAt: t0,
        error: 'El banco no respondió a tiempo.',
      },
    ],
  },
  ...over,
});

describe('la cabecera de la respuesta', () => {
  it('lleva el orbe y el nombre del orquestador, y abre «El equipo» en él', () => {
    const abrir = vi.fn();
    pintar(<CabeceraDeLaRespuesta turno={leerElTurno({ mensaje: respuesta() })} tipo="informative" onAbrirEquipo={abrir} />);
    const cabecera = container.querySelector('[data-testid="cabecera-de-la-respuesta"]')!;
    expect(cabecera.textContent).toContain('Ori');
    expect(cabecera.querySelector('[data-agente="orquestador"]')).not.toBeNull();
    act(() => cabecera.querySelector<HTMLButtonElement>('[data-testid="turno-cabecera"]')!.click());
    expect(abrir).toHaveBeenCalledWith('orquestador');
    // Terminada: el tipo de respuesta, discreto.
    expect(container.querySelector('[data-testid="tipo-de-respuesta"]')!.textContent).toBe('Informativo');
  });

  it('mientras piensa dice que está pensando, y el tipo no se muestra todavía', () => {
    const turno = leerElTurno({
      mensaje: respuesta({ status: 'sending', content: '', agentActivity: undefined }),
      pasos: [{ id: 'entender', kind: 'entender', status: 'running' }],
      enCurso: true,
    });
    pintar(<CabeceraDeLaRespuesta turno={turno} tipo="informative" />);
    expect(container.textContent).toContain('está pensando');
    expect(container.querySelector('[data-testid="tipo-de-respuesta"]')).toBeNull();
  });
});

describe('la delegación de una respuesta cerrada, en una línea', () => {
  it('dice a quién le pasó el trabajo y quién no pudo terminar', () => {
    pintar(<ResumenDelTurno turno={leerElTurno({ mensaje: respuesta() })} />);
    const linea = container.querySelector('[data-testid="resumen-del-turno"]')!;
    expect(linea.textContent).toContain('Ori le pasó el trabajo a Laura y Cobri');
    expect(linea.textContent).toContain('Cobri no pudo terminar');
  });

  it('se abre en el detalle de cada especialista: la tarea y lo que contestó', () => {
    pintar(<ResumenDelTurno turno={leerElTurno({ mensaje: respuesta() })} />);
    expect(container.querySelector('[data-testid="turno-delegaciones"]')).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="resumen-del-turno"] button[aria-expanded]')!.click());
    const detalle = container.querySelector('[data-testid="turno-delegaciones"]')!;
    expect(detalle.textContent).toContain('Listar quién debe más de 30 días');
    expect(detalle.textContent).toContain('7 inquilinos deben más de 30 días.');
    expect(detalle.textContent).toContain('El banco no respondió a tiempo.');
  });

  it('sin especialistas no pinta nada (no se inventa una delegación)', () => {
    pintar(<ResumenDelTurno turno={leerElTurno({ mensaje: respuesta({ agentActivity: undefined }) })} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('«Cómo lo pensó»', () => {
  it('sólo aparece si el micro mandó el razonamiento, y se abre al tocarlo', () => {
    pintar(<RazonamientoDelTurno turno={leerElTurno({ mensaje: respuesta() })} />);
    expect(container.innerHTML).toBe('');
    pintar(
      <RazonamientoDelTurno
        turno={leerElTurno({ mensaje: respuesta({ razonamiento: [{ texto: 'Primero miré la cartera.' }] }) })}
      />
    );
    const boton = container.querySelector<HTMLButtonElement>('[data-testid="turno-razonamiento"] button')!;
    expect(boton.textContent).toContain('Cómo lo pensó');
    expect(container.textContent).not.toContain('Primero miré la cartera.');
    act(() => boton.click());
    expect(container.textContent).toContain('Primero miré la cartera.');
  });
});

