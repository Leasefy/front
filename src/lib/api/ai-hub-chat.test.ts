import { describe, it, expect, vi } from 'vitest';

// Keep the import chain node-safe (agent-auth → supabase client).
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import {
  backendAgentToFrontType,
  targetToHref,
  suggestedActionToResponseAction,
  dispatchToAgentExecution,
  splitSSEEvents,
  handleSSEEvent,
  type ChatStreamHandlers,
} from './ai-hub-chat';

describe('backendAgentToFrontType', () => {
  it('maps the roster 1:1 (front enum aligned with the real roster in F4)', () => {
    expect(backendAgentToFrontType('cobranza')).toBe('cobranza');
    expect(backendAgentToFrontType('matching')).toBe('matching');
    expect(backendAgentToFrontType('estudio')).toBe('estudio');
    expect(backendAgentToFrontType('cotizador')).toBe('cotizador');
  });
});

describe('targetToHref', () => {
  it('routes known targets and falls back to the hub for the rest', () => {
    expect(targetToHref('cobranza')).toBe('/panel/inmobiliaria/ai/cobranza');
    expect(targetToHref('cotizador')).toBe('/panel/inmobiliaria/ai/cotizador');
    expect(targetToHref('pagos')).toBe('/panel/inmobiliaria/ai/pagos');
    expect(targetToHref('cartera')).toBe('/panel/inmobiliaria/ai/cobranza');
    expect(targetToHref('estudio')).toBe('/panel/inmobiliaria/ai');
    expect(targetToHref('conciliacion')).toBe('/panel/inmobiliaria/ai');
  });
});

describe('suggestedActionToResponseAction', () => {
  it('first is primary, rest secondary; carries href + icon', () => {
    const first = suggestedActionToResponseAction(
      { label: 'Ver cobranza', target: 'cobranza' },
      0,
    );
    expect(first).toMatchObject({
      label: 'Ver cobranza',
      href: '/panel/inmobiliaria/ai/cobranza',
      variant: 'primary',
    });
    expect(first.icon.length).toBeGreaterThan(0);
    expect(
      suggestedActionToResponseAction({ label: 'x', target: 'pagos' }, 1).variant,
    ).toBe('secondary');
  });
});

describe('dispatchToAgentExecution', () => {
  const started = new Date('2026-06-08T12:00:00Z');

  it('completed → status completed, no error, agent mapped', () => {
    const ex = dispatchToAgentExecution(
      { agent: 'matching', taskDescription: 'buscar', status: 'completed', summary: 'ok' },
      started,
    );
    expect(ex.status).toBe('completed');
    expect(ex.agentType).toBe('matching');
    expect(ex.error).toBeUndefined();
    expect(ex.completedAt).toBeInstanceOf(Date);
  });

  it('failed → status failed, error = summary', () => {
    const ex = dispatchToAgentExecution(
      { agent: 'estudio', taskDescription: 't', status: 'failed', summary: 'no docs' },
      started,
    );
    expect(ex.status).toBe('failed');
    expect(ex.error).toBe('no docs');
  });
});

describe('splitSSEEvents', () => {
  it('splits on blank lines and carries the partial remainder', () => {
    const { events, rest } = splitSSEEvents(
      'event: a\ndata: 1\n\nevent: b\ndata: 2\n\nevent: c\ndata: par',
    );
    expect(events).toHaveLength(2);
    expect(rest).toBe('event: c\ndata: par');
  });

  it('normalizes CRLF', () => {
    const { events } = splitSSEEvents('event: a\r\ndata: 1\r\n\r\n');
    expect(events).toHaveLength(1);
  });
});

describe('handleSSEEvent', () => {
  function collect(): { calls: string[]; handlers: ChatStreamHandlers } {
    const calls: string[] = [];
    const handlers: ChatStreamHandlers = {
      onSnapshot: () => calls.push('snapshot'),
      onMessage: (t, a) => calls.push(`message:${t}:${a.length}`),
      onDispatchStart: (ag, t) => calls.push(`start:${ag}:${t}`),
      onDispatchResult: (d) => calls.push(`result:${d.agent}:${d.status}`),
      onDone: (f) => calls.push(`done:${f.dispatches.length}`),
      onError: (m) => calls.push(`error:${m}`),
    };
    return { calls, handlers };
  }

  it('dispatches message with text + actions', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: message\ndata: {"type":"message","responseText":"hola","suggestedActions":[{"label":"x","target":"cobranza"}]}',
      handlers,
    );
    expect(calls).toEqual(['message:hola:1']);
  });

  it('dispatches dispatch_start then dispatch_result', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: dispatch_start\ndata: {"agent":"matching","taskDescription":"buscar"}',
      handlers,
    );
    handleSSEEvent(
      'event: dispatch_result\ndata: {"dispatch":{"agent":"matching","taskDescription":"buscar","status":"completed","summary":"ok"}}',
      handlers,
    );
    expect(calls).toEqual(['start:matching:buscar', 'result:matching:completed']);
  });

  it('dispatches done + error and ignores malformed JSON', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: done\ndata: {"responseText":"x","suggestedActions":[],"dispatches":[{"agent":"cobranza","taskDescription":"t","status":"completed","summary":"s"}],"generatedAt":"now"}',
      handlers,
    );
    handleSSEEvent('event: error\ndata: {"error":"boom"}', handlers);
    handleSSEEvent('event: message\ndata: {bad json', handlers);
    expect(calls).toEqual(['done:1', 'error:boom']);
  });
});
