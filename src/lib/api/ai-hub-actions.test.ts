/**
 * F5 action-proposals — tests for:
 *   - handleSSEEvent parsing of `action_proposal`
 *   - executeAction happy / error paths
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import { ApiError } from '@/lib/api/client';
import {
  handleSSEEvent,
  executeAction,
  type ChatStreamHandlers,
  type BackendActionProposal,
} from './ai-hub-chat';

// ── handleSSEEvent — action_proposal ─────────────────────────────────────────

describe('handleSSEEvent — action_proposal', () => {
  function makeHandlers() {
    const received: BackendActionProposal[] = [];
    const handlers: ChatStreamHandlers = {
      onActionProposal: (p) => received.push(p),
    };
    return { received, handlers };
  }

  it('parses a valid action_proposal event', () => {
    const { received, handlers } = makeHandlers();
    handleSSEEvent(
      'event: action_proposal\ndata: {"workItemId":"wi-1","colaType":"pagos","action":"approve","resumen":"Pago $500 000 COP pendiente","requiresConfirmation":true}',
      handlers,
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      workItemId: 'wi-1',
      colaType: 'pagos',
      action: 'approve',
      resumen: 'Pago $500 000 COP pendiente',
      requiresConfirmation: true,
    });
  });

  it('ignores a malformed event missing required fields — does not throw', () => {
    const { received, handlers } = makeHandlers();
    // missing resumen
    expect(() =>
      handleSSEEvent(
        'event: action_proposal\ndata: {"workItemId":"wi-2","colaType":"pagos","action":"approve"}',
        handlers,
      )
    ).not.toThrow();
    expect(received).toHaveLength(0);
  });

  it('ignores malformed JSON — does not throw', () => {
    const { received, handlers } = makeHandlers();
    expect(() =>
      handleSSEEvent('event: action_proposal\ndata: {bad json', handlers)
    ).not.toThrow();
    expect(received).toHaveLength(0);
  });

  it('parses all supported colaType/action combos', () => {
    const combos: Array<{ colaType: string; action: string }> = [
      { colaType: 'conciliacion', action: 'confirm' },
      { colaType: 'conciliacion', action: 'reject' },
      { colaType: 'pagos', action: 'approve' },
      { colaType: 'pagos', action: 'reject' },
      { colaType: 'cobranza', action: 'claim' },
      { colaType: 'cobranza', action: 'resolve' },
    ];
    for (const { colaType, action } of combos) {
      const { received, handlers } = makeHandlers();
      handleSSEEvent(
        `event: action_proposal\ndata: ${JSON.stringify({ workItemId: 'x', colaType, action, resumen: 'r', requiresConfirmation: true })}`,
        handlers,
      );
      expect(received).toHaveLength(1);
      expect(received[0].colaType).toBe(colaType);
      expect(received[0].action).toBe(action);
    }
  });
});

// ── executeAction ─────────────────────────────────────────────────────────────

describe('executeAction', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test';
  });

  it('POST with correct body and returns parsed JSON on 200', async () => {
    const resultPayload = { status: 'approved', workItemId: 'wi-3' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => resultPayload,
    } as Response);

    const result = await executeAction({
      agencyId: 'ag-1',
      workItemId: 'wi-3',
      action: 'approve',
    });

    expect(result).toEqual(resultPayload);
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('http://agent.test/api/agency/ag-1/ai-hub/actions/execute');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body).toEqual({ workItemId: 'wi-3', action: 'approve' });
  });

  it('includes reason in body when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await executeAction({
      agencyId: 'ag-1',
      workItemId: 'wi-4',
      action: 'reject',
      reason: 'Monto incorrecto',
    });

    const [, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(opts.body as string);
    expect(body.reason).toBe('Monto incorrecto');
  });

  // 02-10-2026: el fallo llega ENTERO (`ApiError`) y su texto es SÓLO el
  // `message` del sobre. El `error` del cuerpo viejo y el «execute action NNN»
  // que se armaba acá ya no son el texto (ver `ai-hub-chat.errores.test.ts`).
  it('throws an ApiError with the envelope message on non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ statusCode: 422, code: 'ESTADO_INVALIDO', message: 'Estado inválido para esta acción' }),
    } as Response);

    const e = (await executeAction({ agencyId: 'ag-1', workItemId: 'wi-5', action: 'confirm' }).catch((x: unknown) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 422, code: 'ESTADO_INVALIDO', message: 'Estado inválido para esta acción' });
  });

  it('the old `error` body and an unparseable body never become the text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Invalid state for this action' }),
    } as Response);
    const viejo = (await executeAction({ agencyId: 'ag-1', workItemId: 'wi-5', action: 'confirm' }).catch((x: unknown) => x)) as ApiError;
    expect(viejo).toBeInstanceOf(ApiError);
    expect(viejo.message).toBe('');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    } as unknown as Response);
    const sinCuerpo = (await executeAction({ agencyId: 'ag-1', workItemId: 'wi-6', action: 'approve' }).catch((x: unknown) => x)) as ApiError;
    expect(sinCuerpo).toBeInstanceOf(ApiError);
    expect(sinCuerpo.status).toBe(500);
    expect(sinCuerpo.message).not.toContain('execute action');
  });
});
