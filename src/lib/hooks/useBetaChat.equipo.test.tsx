/**
 * El equipo en el turno del chat (02-10-2026, commit `27a3b2b8`).
 *
 * El orquestador ES quien responde y le pasa el trabajo a los especialistas.
 * Para que la respuesta lo cuente después, el hook guarda:
 *   · el RESUMEN de cada especialista en su ejecución (`resumen`), que el micro
 *     ya mandaba en `dispatch_result` y se perdía;
 *   · de QUIÉN es cada herramienta (`agentType` en el paso `herramienta`);
 *   · «lo que pensó» (`razonamiento`), cuando el micro lo mande en el `done`;
 *   · el id de cada despacho, cuando el micro lo mande.
 * Y despachar cierra «entender»: el orquestador ya decidió.
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: 'ag-1' } }),
}));

const streamChatTurn = vi.fn();
const postChatTurn = vi.fn();

vi.mock('@/lib/api/ai-hub-chat', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/ai-hub-chat')>('@/lib/api/ai-hub-chat');
  return {
    ...real,
    isAgentConfigured: () => true,
    streamChatTurn: (...a: unknown[]) => streamChatTurn(...a),
    postChatTurn: (...a: unknown[]) => postChatTurn(...a),
  };
});

import { useBetaChat } from './useBetaChat';

beforeEach(() => {
  localStorage.clear();
  streamChatTurn.mockReset();
  postChatTurn.mockReset();
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

type Manejadores = {
  onSnapshot: (s: unknown) => void;
  onMessage: (t: string, a: unknown[]) => void;
  onDispatchStart: (agent: string, task: string, extra?: { id?: string }) => void;
  onDispatchResult: (d: unknown) => void;
  onToolStep: (s: { agent: string; tool: string; label: string; dispatchId?: string }) => void;
  onDone: (f: unknown) => void;
};

const ultimaRespuesta = (s: ReturnType<typeof montar>) =>
  [...s.actual.messages].reverse().find((m) => m.role === 'assistant')!;

describe('el turno guarda lo que hizo el equipo', () => {
  it('el resumen del especialista queda en su ejecución, la herramienta sabe de quién es y el texto no lo repite', async () => {
    let seguir!: () => void;
    const pausa = new Promise<void>((r) => (seguir = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      const h = args.handlers;
      h.onSnapshot(null);
      h.onDispatchStart('cobranza', 'Listar quién debe más de 30 días');
      h.onToolStep({ agent: 'cobranza', tool: 'listar', label: 'Listó los contratos con saldo vencido' });
      await pausa;
      h.onDispatchResult({ agent: 'cobranza', taskDescription: 't', status: 'completed', summary: '7 inquilinos deben más de 30 días.' });
      h.onMessage('Hoy 7 inquilinos deben más de 30 días.', []);
      h.onDone({
        responseText: 'Hoy 7 inquilinos deben más de 30 días.',
        suggestedActions: [],
        dispatches: [{ agent: 'cobranza', taskDescription: 't', status: 'completed', summary: '7 inquilinos deben más de 30 días.' }],
        razonamiento: [{ texto: 'Primero miré la cartera.' }, 'Después le pedí la lista a cobranza.'],
      });
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿quién me debe más de 30 días?');
    });
    await esperarA(() => s.actual.turnSteps.some((p) => p.kind === 'herramienta'));
    // La herramienta es de cobranza, y despachar cerró «entender».
    expect(s.actual.turnSteps.find((p) => p.kind === 'herramienta')!.agentType).toBe('cobranza');
    expect(s.actual.turnSteps.find((p) => p.id === 'entender')!.status).toBe('done');
    expect(s.actual.turnSteps.filter((p) => p.status === 'running').map((p) => p.kind)).toEqual(['agente']);

    seguir();
    await esperarA(() => ultimaRespuesta(s).status === 'complete');
    const m = ultimaRespuesta(s);
    expect(m.agentActivity!.agents[0]).toMatchObject({ agentType: 'cobranza', status: 'completed', resumen: '7 inquilinos deben más de 30 días.' });
    expect(m.razonamiento).toEqual([{ texto: 'Primero miré la cartera.' }, { texto: 'Después le pedí la lista a cobranza.' }]);
    // El resumen vive en la delegación: el texto no lo repite al final.
    expect(m.content).toBe('Hoy 7 inquilinos deben más de 30 días.');
    s.soltar();
  });

  it('sin `razonamiento` en el `done` no se inventa nada', async () => {
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      const h = args.handlers;
      h.onMessage('Listo.', []);
      h.onDone({ responseText: 'Listo.', suggestedActions: [], dispatches: [] });
    });
    const s = montar();
    act(() => {
      s.actual.sendMessage('hola');
    });
    await esperarA(() => ultimaRespuesta(s).status === 'complete');
    expect(ultimaRespuesta(s).razonamiento).toBeUndefined();
    s.soltar();
  });

  it('con el id del despacho (cuando el micro lo mande) se cierra ESE, aunque sea del mismo especialista', async () => {
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => (soltar = r));
    streamChatTurn.mockImplementation(async (args: { handlers: Manejadores }) => {
      const h = args.handlers;
      h.onDispatchStart('cobranza', 'Primera tarea', { id: 'd-1' });
      h.onDispatchStart('cobranza', 'Segunda tarea', { id: 'd-2' });
      h.onDispatchResult({ id: 'd-2', agent: 'cobranza', taskDescription: 'Segunda tarea', status: 'completed', summary: 'La segunda.' });
      await colgado;
    });
    const s = montar();
    act(() => {
      s.actual.sendMessage('dos cosas de cobranza');
    });
    await esperarA(() => s.actual.turnSteps.filter((p) => p.kind === 'agente').some((p) => p.status === 'done'));
    const agentes = s.actual.turnSteps.filter((p) => p.kind === 'agente');
    expect(agentes.map((p) => [p.despachoId, p.status])).toEqual([
      ['d-1', 'running'],
      ['d-2', 'done'],
    ]);
    soltar();
    s.soltar();
  });
});
