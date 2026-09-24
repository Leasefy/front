import { describe, it, expect, vi } from 'vitest';

// Keep the import chain node-safe (agent-auth → supabase client).
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import {
  backendAgentToFrontType,
  targetToHref,
  targetTienePantalla,
  suggestedActionToResponseAction,
  dispatchToAgentExecution,
  splitSSEEvents,
  handleSSEEvent,
  mapBackendBriefing,
  sectionsFromSnapshot,
  type ChatStreamHandlers,
  type BackendSnapshot,
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
    expect(targetToHref('cobranza')).toBe('/panel/inmobiliaria/pagos/cobranza');
    expect(targetToHref('cotizador')).toBe('/panel/inmobiliaria/postulaciones/asegurabilidad');
    expect(targetToHref('pagos')).toBe('/panel/inmobiliaria/pagos');
    expect(targetToHref('cartera')).toBe('/panel/inmobiliaria/pagos/cobranza');
    // Evaluación de candidatos está oculta (Nico, 2026-09-08): sin workspace,
    // el target cae al Piloto como cualquier meta sin pantalla.
    expect(targetToHref('estudio')).toBe('/panel/inmobiliaria/piloto');
    expect(targetToHref('conciliacion')).toBe('/panel/inmobiliaria/conciliacion');
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
      href: '/panel/inmobiliaria/pagos/cobranza',
      variant: 'primary',
    });
    expect(first.icon.length).toBeGreaterThan(0);
    expect(
      suggestedActionToResponseAction({ label: 'x', target: 'pagos' }, 1).variant,
    ).toBe('secondary');
  });

  // 🔴 Medido en vivo: «Ver inmuebles disponibles» mandaba su texto como un
  // mensaje nuevo y dejaba al operador otros ~25 s esperando por una lista que
  // el panel ya muestra. Sin `prompt` = el botón navega.
  it('una acción con pantalla en el panel NAVEGA (no manda un prompt)', () => {
    const a = suggestedActionToResponseAction({ label: 'Ver inmuebles disponibles', target: 'matching' }, 0);
    expect(targetTienePantalla('matching')).toBe(true);
    expect(a.prompt).toBeUndefined();
    expect(a.href).toBe(targetToHref('matching'));
  });

  it('las metas del contrato con pantalla navegan; Evaluación de candidatos está oculta y pregunta', () => {
    const conPantalla = ['cobranza', 'cotizador', 'matching', 'pagos', 'conciliacion', 'avaluo', 'cartera'] as const;
    for (const t of conPantalla) {
      const a = suggestedActionToResponseAction({ label: `ir a ${t}`, target: t }, 0);
      expect(targetTienePantalla(t), t).toBe(true);
      expect(a.prompt).toBeUndefined();
    }
    // `estudio` sigue en el contrato del micro, pero su sección está oculta
    // (Nico, 2026-09-08): sin workspace no hay pantalla que abrir, así que el
    // botón le pregunta al asistente en vez de mandar a una puerta que
    // devuelve a Postulaciones.
    const oculta = suggestedActionToResponseAction({ label: 'ir a estudio', target: 'estudio' }, 0);
    expect(targetTienePantalla('estudio')).toBe(false);
    expect(oculta.prompt).toBe('ir a estudio');
  });
});

describe('BackendChatResponse — pendingApprovals del camino de respaldo', () => {
  // 🔴 El espejo del front omitía `pendingApprovals`, así que por el POST de
  // respaldo una acción vinculante propuesta nunca mostraba su DecisionCard.
  it('el tipo acepta pendingApprovals y sobrevive el JSON del backend', () => {
    const crudo = JSON.parse(
      JSON.stringify({
        responseText: 'Propongo un acuerdo de pago.',
        suggestedActions: [],
        dispatches: [],
        pendingApprovals: [
          {
            id: 'ap-1',
            agent: 'cobranza',
            actionType: 'payment_plan',
            title: 'Acuerdo de pago',
            description: '3 cuotas',
            payloadPreview: { cuotas: '3' },
            options: [{ id: 'o1', label: 'Aprobar', description: 'd', recommendation: 'recommended' }],
            requiresApproval: true,
          },
        ],
        snapshot: null,
        generatedAt: '2026-09-05T00:00:00.000Z',
      }),
    ) as import('./ai-hub-chat').BackendChatResponse;
    expect(crudo.pendingApprovals?.[0]?.id).toBe('ap-1');
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
      onToolStep: (p) => calls.push(`tool:${p.agent}:${p.tool}:${p.label}`),
      onPendingApproval: (a) => calls.push(`approval:${a.id}:${a.options.length}`),
      onDone: (f) => calls.push(`done:${f.dispatches.length}`),
      onError: (m, meta) => calls.push(`error:${m}:${meta?.status ?? '-'}:${meta?.code ?? '-'}`),
    };
    return { calls, handlers };
  }

  it('🔴 el error del stream conserva su código: sin créditos no es «no pude conectarme»', () => {
    // B2 de la auditoría del 13-09. La respuesta HTTP del stream ya salió con
    // 200, así que el único lugar donde puede viajar el 402 es este evento.
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: error\ndata: {"error":"La cuenta de IA se quedó sin créditos.","status":402,"code":"sin_creditos_ia"}',
      handlers,
    );
    expect(calls).toEqual(['error:La cuenta de IA se quedó sin créditos.:402:sin_creditos_ia']);
  });

  it('un error sin código sigue llegando, sin inventarle uno', () => {
    const { calls, handlers } = collect();
    handleSSEEvent('event: error\ndata: {"error":"boom"}', handlers);
    expect(calls).toEqual(['error:boom:-:-']);
  });

  it('dispatches message with text + actions', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: message\ndata: {"type":"message","responseText":"hola","suggestedActions":[{"label":"x","target":"cobranza"}]}',
      handlers,
    );
    expect(calls).toEqual(['message:hola:1']);
  });

  it('reporta un paso interno del especialista con su etiqueta', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: tool_step\ndata: {"type":"tool_step","agent":"cobranza","tool":"checkAgencyPolicy","label":"Revisar los límites que autorizó la inmobiliaria"}',
      handlers,
    );
    expect(calls).toEqual(['tool:cobranza:checkAgencyPolicy:Revisar los límites que autorizó la inmobiliaria']);
  });

  it('cae al nombre crudo de la herramienta cuando no viene etiqueta', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: tool_step\ndata: {"type":"tool_step","agent":"cotizador","tool":"quoteSura"}',
      handlers,
    );
    expect(calls).toEqual(['tool:cotizador:quoteSura:quoteSura']);
  });

  it('entrega la aprobación pendiente que antes se perdía', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: pending_approval\ndata: {"type":"pending_approval","approval":{"id":"approval-pagos-send_cobro-1","agent":"pagos","actionType":"send_cobro","title":"Confirmar acción de pagos","description":"Enviar el cobro","payloadPreview":{},"options":[{"id":"approve","label":"Aprobar","description":"","recommendation":"neutral"},{"id":"cancel","label":"Cancelar","description":"","recommendation":"neutral"}],"requiresApproval":true}}',
      handlers,
    );
    expect(calls).toEqual(['approval:approval-pagos-send_cobro-1:2']);
  });

  it('ignora una aprobación sin opciones en vez de dibujar una tarjeta muerta', () => {
    const { calls, handlers } = collect();
    handleSSEEvent(
      'event: pending_approval\ndata: {"type":"pending_approval","approval":{"id":"x","options":[]}}',
      handlers,
    );
    expect(calls).toEqual([]);
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
    expect(calls).toEqual(['done:1', 'error:boom:-:-']);
  });

  // ── Nico, 23-09: «se queda ahí sólo con un texto y sin cargas» ─────────────
  it('entrega el `progreso` del paso activo (evento aditivo del micro)', () => {
    const vistos: unknown[] = [];
    handleSSEEvent('event: progreso\ndata: {"type":"progreso","texto":"Leyendo contratos…"}', {
      onProgreso: (p) => vistos.push(p),
    });
    handleSSEEvent('event: progreso\ndata: {"type":"progreso","texto":" Revisando 29 filas ","hechos":29,"total":40}', {
      onProgreso: (p) => vistos.push(p),
    });
    // Un aviso vacío no borra la línea viva del paso.
    handleSSEEvent('event: progreso\ndata: {"type":"progreso","texto":"  "}', {
      onProgreso: (p) => vistos.push(p),
    });
    expect(vistos).toEqual([
      { texto: 'Leyendo contratos…' },
      { texto: 'Revisando 29 filas', hechos: 29, total: 40 },
    ]);
  });

  it('el `done` trae la parte con FORMA (bloques y entidades); lo que no se entiende se descarta', () => {
    let final: Parameters<NonNullable<ChatStreamHandlers['onDone']>>[0] | null = null;
    const done = {
      responseText: 'Tienes 2 contratos que vencen en octubre.',
      suggestedActions: [],
      dispatches: [],
      generatedAt: 'now',
      bloques: [
        {
          tipo: 'tabla',
          titulo: 'contratos',
          columnas: [
            { clave: 'codigo', titulo: 'Código', formato: 'numero' },
            { clave: 'canon', titulo: 'Canon', formato: 'moneda' },
          ],
          filas: [{ codigo: 101, canon: 2500000 }],
          total: 1,
          truncada: false,
        },
        { tipo: 'metrica', titulo: 'Contratos', valor: 2, formato: 'numero' },
        { tipo: 'grafica', puntos: [] },
        { tipo: 'metrica', titulo: 'roto', valor: 'dos' },
      ],
      entidades: [
        { tipo: 'inquilino', id: 'p-1', titulo: 'Juan Camilo López', motivo: 'nombre', contratos: [] },
        { tipo: 'marciano', id: 'x' },
      ],
    };
    handleSSEEvent(`event: done\ndata: ${JSON.stringify(done)}`, { onDone: (f) => (final = f) });
    expect(final!.bloques.map((b) => b.tipo)).toEqual(['tabla', 'metrica']);
    expect(final!.entidades.map((e) => e.titulo)).toEqual(['Juan Camilo López']);
  });

  it('un micro viejo (sin `bloques` ni `entidades`) deja las dos listas vacías, no `undefined`', () => {
    let final: Parameters<NonNullable<ChatStreamHandlers['onDone']>>[0] | null = null;
    handleSSEEvent('event: done\ndata: {"responseText":"x","suggestedActions":[],"dispatches":[]}', {
      onDone: (f) => (final = f),
    });
    expect(final!.bloques).toEqual([]);
    expect(final!.entidades).toEqual([]);
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

/**
 * B2 — `new Error('ai-hub chat ' + status)` tiraba el status a la basura: un
 * 402 (sin créditos de IA) y un 429 se pintaban igual que un 500. Ahora el
 * transporte rechaza con `ApiError`, que `clasificarFallo` sabe leer.
 */
describe('postChatTurn / streamChatTurn — el fallo conserva status y cuerpo', () => {
  const respuesta = (status: number, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
    ({
      ok: false,
      status,
      body: null,
      headers: new Headers(cabeceras),
      json: async () => cuerpo,
      text: async () => JSON.stringify(cuerpo),
    }) as unknown as Response;

  it.each([402, 503])('POST con %i rechaza con ApiError y ese status', async (status) => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
    const { postChatTurn } = await import('./ai-hub-chat');
    const { ApiError } = await import('@/lib/api/client');
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(status, { message: 'sin saldo', code: 'X' })));
    try {
      const err = await postChatTurn({ agencyId: 'ag-1', message: 'hola' }).catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(status);
      expect(err.code).toBe('X');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  /**
   * 23-09 — el 429 del micro se dice IGUAL que el del back: con cuánto
   * esperar. Antes llegaba a la burbuja el `message` crudo del micro («Too
   * many requests») o «ai-hub chat 429», sin plazo.
   */
  it('un 429 del micro dice cuánto esperar, con el mismo mensaje que el del back', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
    const { postChatTurn, streamChatTurn } = await import('./ai-hub-chat');
    const { ApiError } = await import('@/lib/api/client');
    const { mensajeDeDemasiadasSolicitudes, CODIGO_DEMASIADAS_SOLICITUDES } = await import(
      '@/lib/api/demasiadas-solicitudes'
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respuesta(429, { message: 'Too many requests' }, { 'Retry-After': '45' })),
    );
    try {
      for (const intento of [
        () => postChatTurn({ agencyId: 'ag-1', message: 'hola' }),
        () => streamChatTurn({ agencyId: 'ag-1', message: 'hola', handlers: {} }),
      ]) {
        const err = await intento().catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(429);
        expect(err.code).toBe(CODIGO_DEMASIADAS_SOLICITUDES);
        expect(err.message).toBe(mensajeDeDemasiadasSolicitudes(45));
        expect(err.detalle.reintentarEnSegundos).toBe(45);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('el stream que no abre también rechaza con ApiError', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
    const { streamChatTurn } = await import('./ai-hub-chat');
    const { ApiError } = await import('@/lib/api/client');
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(402, { error: 'credit balance is too low' })));
    try {
      const err = await streamChatTurn({ agencyId: 'ag-1', message: 'hola', handlers: {} }).catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(402);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
