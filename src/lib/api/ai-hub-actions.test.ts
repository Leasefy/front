/**
 * F5 action-proposals — tests for:
 *   - handleSSEEvent parsing of `action_proposal`
 *   - executeAction happy / error paths
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

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

  it('throws on non-2xx with backend error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Estado inválido para esta acción' }),
    } as Response);

    await expect(
      executeAction({ agencyId: 'ag-1', workItemId: 'wi-5', action: 'confirm' })
    ).rejects.toThrow('Estado inválido para esta acción');
  });

  it('throws with default message when error body is not parseable', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    } as unknown as Response);

    await expect(
      executeAction({ agencyId: 'ag-1', workItemId: 'wi-6', action: 'approve' })
    ).rejects.toThrow('execute action 500');
  });
});
