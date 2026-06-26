import { describe, it, expect, vi, afterEach } from 'vitest';

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
  pendingApprovalToPendingDecision,
  resolveChatApproval,
  mapBackendBriefing,
  sectionsFromSnapshot,
  type ChatStreamHandlers,
  type BackendSnapshot,
  type BackendPendingApproval,
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
    expect(targetToHref('cotizador')).toBe('/panel/inmobiliaria/ai/asegurabilidad');
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

// ── Briefing mapper (F4) ──────────────────────────────────────────────────────

const SNAPSHOT: BackendSnapshot = {
  deudoresActivos: 12,
  pagadoHoyCop: 1500000,
  llamadasHoy: 4,
  escalacionesPendientes: 2,
  enPrejuridico: 1,
  generatedAt: '2026-06-10T12:00:00.000Z',
};

describe('sectionsFromSnapshot', () => {
  it('always emits cobranza; escalaciones/prejuridico only when > 0', () => {
    const sections = sectionsFromSnapshot(SNAPSHOT);
    expect(sections.map((s) => s.id)).toEqual(['cobros', 'escalaciones', 'prejuridico']);
    expect(sections[0].summary).toContain('12 deudores');

    const quiet = sectionsFromSnapshot({
      ...SNAPSHOT,
      escalacionesPendientes: 0,
      enPrejuridico: 0,
    });
    expect(quiet.map((s) => s.id)).toEqual(['cobros']);
  });

  it('only uses icons/colors BriefingCard can render', () => {
    for (const s of sectionsFromSnapshot(SNAPSHOT)) {
      expect([
        'CurrencyDollar', 'FunnelSimple', 'Wrench', 'FileText',
        'ChatCircle', 'ChartBar', 'ListChecks',
      ]).toContain(s.icon);
      expect(['emerald', 'blue', 'amber', 'purple', 'pink', 'indigo']).toContain(s.color);
    }
  });
});

describe('mapBackendBriefing (tolerant)', () => {
  it('maps a full sections payload', () => {
    const briefing = mapBackendBriefing({
      id: 'b1',
      greeting: 'Hola',
      overallSummary: 'Resumen',
      sections: [
        {
          id: 'cobros',
          title: 'Cobros',
          summary: '3 pendientes',
          details: ['a', 'b', 42],
          actionLabel: 'Ver',
          actionContext: 'ctx',
        },
      ],
      generatedAt: '2026-06-10T07:00:00.000Z',
    });
    expect(briefing).not.toBeNull();
    expect(briefing!.id).toBe('b1');
    expect(briefing!.greeting).toBe('Hola');
    expect(briefing!.sections).toHaveLength(1);
    expect(briefing!.sections[0]).toMatchObject({
      id: 'cobros',
      icon: 'CurrencyDollar',
      color: 'emerald',
      details: ['a', 'b'], // non-strings dropped
      actionLabel: 'Ver',
    });
    expect(briefing!.isNew).toBe(true);
  });

  it('sanitizes unknown icons/colors to safe defaults', () => {
    const briefing = mapBackendBriefing({
      sections: [
        { id: 'misc', title: 'Otro', summary: 's', icon: 'NotAnIcon', color: 'magenta' },
      ],
    });
    expect(briefing!.sections[0].icon).toBe('ListChecks');
    expect(briefing!.sections[0].color).toBe('blue');
  });

  it('synthesizes sections from the snapshot when sections are absent', () => {
    const briefing = mapBackendBriefing({ snapshot: SNAPSHOT });
    expect(briefing).not.toBeNull();
    expect(briefing!.sections.map((s) => s.id)).toContain('cobros');
    expect(briefing!.date.toISOString()).toBe(SNAPSHOT.generatedAt);
    expect(briefing!.greeting.length).toBeGreaterThan(0);
    expect(briefing!.overallSummary.length).toBeGreaterThan(0);
  });

  it('returns null for unusable payloads (caller keeps the mock briefing)', () => {
    expect(mapBackendBriefing(null)).toBeNull();
    expect(mapBackendBriefing('nope')).toBeNull();
    expect(mapBackendBriefing({})).toBeNull();
    expect(mapBackendBriefing({ sections: [{ id: 'x' }] })).toBeNull();
    expect(mapBackendBriefing({ sections: [], snapshot: null })).toBeNull();
  });

  it('tolerates a bad generatedAt date', () => {
    const briefing = mapBackendBriefing({ snapshot: { ...SNAPSHOT, generatedAt: 'garbage' } });
    expect(briefing).not.toBeNull();
    expect(Number.isNaN(briefing!.date.getTime())).toBe(false);
  });
});

// ── Approval gate (F2) ─────────────────────────────────────────────────────────

const APPROVAL: BackendPendingApproval = {
  id: 'approval-pagos-create_invoice-1750000000000',
  agent: 'pagos',
  actionType: 'create_invoice',
  title: 'Confirmar acción de pagos',
  description: 'Crear el cargo del período para el inquilino X.',
  payloadPreview: { inquilino: 'X', monto: '$1.200.000' },
  options: [
    { id: 'approve', label: 'Aprobar', description: 'Abre el frente', recommendation: 'neutral' },
    { id: 'cancel', label: 'Cancelar', description: 'No hacer nada', recommendation: 'neutral' },
  ],
  requiresApproval: true,
};

describe('pendingApprovalToPendingDecision', () => {
  it('maps a backend approval → a front PendingDecision carrying approvalId', () => {
    const decision = pendingApprovalToPendingDecision(APPROVAL);
    expect(decision.id).toBe(APPROVAL.id);
    expect(decision.approvalId).toBe(APPROVAL.id);
    expect(decision.category).toBe('pagos'); // proposing agent
    expect(decision.title).toBe(APPROVAL.title);
    expect(decision.options).toHaveLength(2);
    expect(decision.options[0]).toMatchObject({ id: 'approve', recommendation: 'neutral' });
    expect(decision.selectedOptionId).toBeUndefined();
  });
});

describe('handleSSEEvent — approvals', () => {
  it('dispatches pending_approval to onPendingApproval', () => {
    const seen: BackendPendingApproval[] = [];
    const handlers: ChatStreamHandlers = { onPendingApproval: (a) => seen.push(a) };
    handleSSEEvent(
      `event: pending_approval\ndata: ${JSON.stringify({ type: 'pending_approval', approval: APPROVAL })}`,
      handlers,
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe(APPROVAL.id);
    expect(seen[0].agent).toBe('pagos');
  });

  it('done carries pendingApprovals (defaults to [] when absent)', () => {
    const finals: number[] = [];
    const handlers: ChatStreamHandlers = {
      onDone: (f) => finals.push(f.pendingApprovals.length),
    };
    handleSSEEvent(
      `event: done\ndata: ${JSON.stringify({
        responseText: 'x',
        suggestedActions: [],
        dispatches: [],
        pendingApprovals: [APPROVAL],
        generatedAt: 'now',
      })}`,
      handlers,
    );
    // Absent pendingApprovals → [] (back-compat with the F1 done payload).
    handleSSEEvent(
      'event: done\ndata: {"responseText":"x","suggestedActions":[],"dispatches":[],"generatedAt":"now"}',
      handlers,
    );
    expect(finals).toEqual([1, 0]);
  });
});

describe('resolveChatApproval', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('POSTs outcome to the resolve route and returns the parsed resolution', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({
        approvalId: APPROVAL.id,
        outcome: 'approved',
        knowledgeUpdated: true,
        semanticUpdated: false,
        resolvedAt: '2026-06-25T00:00:00.000Z',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await resolveChatApproval({
      agencyId: 'agency-1',
      approvalId: APPROVAL.id,
      outcome: 'approved',
    });

    expect(res.knowledgeUpdated).toBe(true);
    expect(res.semanticUpdated).toBe(false);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      `http://agent.test/api/agency/agency-1/ai-hub/chat/approvals/${encodeURIComponent(APPROVAL.id)}/resolve`,
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ outcome: 'approved' });
  });

  it('throws on a non-OK status (caller decides whether to surface)', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })));
    await expect(
      resolveChatApproval({ agencyId: 'a', approvalId: APPROVAL.id, outcome: 'rejected' }),
    ).rejects.toThrow('403');
  });
});
