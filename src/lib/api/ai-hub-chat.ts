'use client';

/**
 * ai-hub-chat — browser client for the agency AI chat home backend (F2).
 *
 * Wires the beta chat to the agent service's chat brain:
 *   POST /api/agency/:agencyId/ai-hub/chat          (one-shot JSON)
 *   POST /api/agency/:agencyId/ai-hub/chat/stream   (SSE: snapshot→message→dispatch_*→done)
 *
 * The SSE transport is POST (the message is in the body), so we consume it with
 * fetch + a stream reader — NOT EventSource (GET-only). Auth = Supabase bearer
 * via agentAuthHeaders(); base URL = NEXT_PUBLIC_AGENT_URL.
 *
 * Pure mappers (backend → the front `beta-chat` contract) + the SSE parser are
 * exported for unit testing without a browser/network.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type {
  AgentType,
  AgentExecution,
  ResponseAction,
  DailyBriefing,
  BriefingSection,
} from '@/lib/types/beta-chat';

// ── Backend contract (mirror of the agent's agency-ai-hub-chat[-stream]) ──────

export type BackendDispatchAgent =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching';

// ── Action Proposal contract (backend → front, F5) ────────────────────────────

export type BackendActionProposalColaType = 'conciliacion' | 'pagos' | 'cobranza';
export type BackendActionProposalAction = 'confirm' | 'reject' | 'approve' | 'claim' | 'resolve';

/** Shape of the `action_proposal` SSE event data. */
export interface BackendActionProposal {
  workItemId: string;
  colaType: BackendActionProposalColaType;
  action: BackendActionProposalAction;
  resumen: string;
  requiresConfirmation: true;
}

export type BackendActionTarget =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'pagos'
  | 'conciliacion'
  | 'cartera';

export interface BackendSuggestedAction {
  label: string;
  target: BackendActionTarget;
}

export interface BackendDispatch {
  agent: BackendDispatchAgent;
  taskDescription: string;
  status: 'completed' | 'failed';
  summary: string;
  nextStep?: string;
}

export interface BackendSnapshot {
  deudoresActivos: number;
  pagadoHoyCop: number;
  llamadasHoy: number;
  escalacionesPendientes: number;
  enPrejuridico: number;
  generatedAt: string;
}

export interface BackendChatResponse {
  responseText: string;
  suggestedActions: BackendSuggestedAction[];
  dispatches: BackendDispatch[];
  snapshot: BackendSnapshot | null;
  generatedAt: string;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// ── Mappers (backend → front beta-chat contract) ──────────────────────────────

/**
 * Backend dispatch agent → the front `AgentType`. 1:1 since F4 aligned the
 * front enum with the real roster (cobranza/cotizador/estudio/matching).
 */
export function backendAgentToFrontType(agent: BackendDispatchAgent): AgentType {
  return agent;
}

/**
 * Front route for a suggested-action target. Only some `/ai/*` routes exist
 * today; unknown targets fall back to the AI hub landing (never a dead/404 link).
 */
export function targetToHref(target: BackendActionTarget): string {
  const base = '/panel/inmobiliaria/ai';
  switch (target) {
    case 'cobranza':
      return `${base}/cobranza`;
    case 'cotizador':
      return `${base}/cotizador`;
    case 'pagos':
      return `${base}/pagos`;
    case 'cartera':
      return `${base}/cobranza`; // cartera overview lives under cobranza
    case 'estudio':
    case 'conciliacion':
    default:
      return base; // route not present yet → AI hub landing
  }
}

const TARGET_ICON: Record<BackendActionTarget, string> = {
  cobranza: 'CurrencyDollar',
  cotizador: 'ShieldCheck',
  estudio: 'FileText',
  matching: 'FunnelSimple',
  pagos: 'Bank',
  conciliacion: 'ArrowsLeftRight',
  cartera: 'ChartBar',
};

export function suggestedActionToResponseAction(
  action: BackendSuggestedAction,
  index: number,
): ResponseAction {
  return {
    id: `act_${index}_${action.target}`,
    label: action.label,
    href: targetToHref(action.target),
    icon: TARGET_ICON[action.target] ?? 'ArrowRight',
    variant: index === 0 ? 'primary' : 'secondary',
  };
}

/** A finished backend dispatch → a terminal front `AgentExecution`. */
export function dispatchToAgentExecution(
  dispatch: BackendDispatch,
  startedAt: Date,
): AgentExecution {
  return {
    id: `disp_${dispatch.agent}_${startedAt.getTime()}`,
    agentType: backendAgentToFrontType(dispatch.agent),
    taskDescription: dispatch.taskDescription,
    status: dispatch.status,
    startedAt,
    completedAt: new Date(),
    ...(dispatch.status === 'failed' ? { error: dispatch.summary } : {}),
  };
}

// ── SSE parsing (pure, testable) ──────────────────────────────────────────────

export interface ChatStreamHandlers {
  onSnapshot?: (snapshot: BackendSnapshot | null) => void;
  onMessage?: (
    responseText: string,
    suggestedActions: BackendSuggestedAction[],
  ) => void;
  onDispatchStart?: (
    agent: BackendDispatchAgent,
    taskDescription: string,
  ) => void;
  onDispatchResult?: (dispatch: BackendDispatch) => void;
  /** Called for each `action_proposal` SSE event (F5). */
  onActionProposal?: (proposal: BackendActionProposal) => void;
  onDone?: (final: {
    responseText: string;
    suggestedActions: BackendSuggestedAction[];
    dispatches: BackendDispatch[];
    generatedAt: string;
  }) => void;
  onError?: (message: string) => void;
}

/**
 * Split accumulated SSE text on event boundaries (a blank line). Returns the
 * complete event blocks plus the trailing partial remainder to carry forward.
 */
export function splitSSEEvents(buffer: string): {
  events: string[];
  rest: string;
} {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts.filter((p) => p.trim().length > 0), rest };
}

/**
 * Parse one SSE event block (`event: <name>\ndata: <json>`) and dispatch it to
 * the matching handler. Malformed JSON / unknown events are ignored.
 */
export function handleSSEEvent(
  rawEvent: string,
  handlers: ChatStreamHandlers,
): void {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join('\n'));
  } catch {
    return;
  }
  const obj = (data ?? {}) as Record<string, unknown>;

  switch (eventName) {
    case 'snapshot':
      handlers.onSnapshot?.((data as BackendSnapshot | null) ?? null);
      break;
    case 'message':
      handlers.onMessage?.(
        String(obj.responseText ?? ''),
        (obj.suggestedActions as BackendSuggestedAction[]) ?? [],
      );
      break;
    case 'dispatch_start':
      handlers.onDispatchStart?.(
        obj.agent as BackendDispatchAgent,
        String(obj.taskDescription ?? ''),
      );
      break;
    case 'dispatch_result':
      if (obj.dispatch) handlers.onDispatchResult?.(obj.dispatch as BackendDispatch);
      break;
    case 'action_proposal': {
      // Validate the minimum required fields before forwarding (D-42-03 fail-open).
      const workItemId = obj.workItemId;
      const colaType = obj.colaType;
      const action = obj.action;
      const resumen = obj.resumen;
      if (
        typeof workItemId === 'string' && workItemId &&
        typeof colaType === 'string' && colaType &&
        typeof action === 'string' && action &&
        typeof resumen === 'string' && resumen
      ) {
        handlers.onActionProposal?.({
          workItemId,
          colaType: colaType as BackendActionProposalColaType,
          action: action as BackendActionProposalAction,
          resumen,
          requiresConfirmation: true,
        });
      } else {
        // Malformed — warn and silently skip (never breaks the stream).
        if (typeof console !== 'undefined') {
          console.warn('[ai-hub-chat] malformed action_proposal event ignored', obj);
        }
      }
      break;
    }
    case 'done':
      handlers.onDone?.({
        responseText: String(obj.responseText ?? ''),
        suggestedActions: (obj.suggestedActions as BackendSuggestedAction[]) ?? [],
        dispatches: (obj.dispatches as BackendDispatch[]) ?? [],
        generatedAt: String(obj.generatedAt ?? ''),
      });
      break;
    case 'error':
      handlers.onError?.(String(obj.error ?? 'stream error'));
      break;
    default:
      break;
  }
}

// ── Network ───────────────────────────────────────────────────────────────────

function agentBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_AGENT_URL not configured');
  return base;
}

/** Whether the agent backend is reachable in this build (dev posture check). */
export function isAgentConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AGENT_URL);
}

function buildBody(message: string, history?: ChatHistoryEntry[]): string {
  return JSON.stringify({
    message,
    ...(history && history.length > 0 ? { history } : {}),
  });
}

/** One-shot, non-streaming turn (used as the streaming fallback). */
export async function postChatTurn(args: {
  agencyId: string;
  message: string;
  history?: ChatHistoryEntry[];
  signal?: AbortSignal;
}): Promise<BackendChatResponse> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: buildBody(args.message, args.history),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) throw new Error(`ai-hub chat ${res.status}`);
  return (await res.json()) as BackendChatResponse;
}

/**
 * Streaming turn over SSE. Calls the handlers in order as events arrive. Throws
 * if the request can't be opened (the caller falls back to postChatTurn).
 */
export async function streamChatTurn(args: {
  agencyId: string;
  message: string;
  history?: ChatHistoryEntry[];
  signal?: AbortSignal;
  handlers: ChatStreamHandlers;
}): Promise<void> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({
      'content-type': 'application/json',
      accept: 'text/event-stream',
    }),
    body: buildBody(args.message, args.history),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok || !res.body) throw new Error(`ai-hub chat stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = splitSSEEvents(buffer);
      buffer = rest;
      for (const event of events) handleSSEEvent(event, args.handlers);
    }
    // Flush any trailing event without a final blank line.
    const tail = buffer + decoder.decode();
    const { events } = splitSSEEvents(tail + '\n\n');
    for (const event of events) handleSSEEvent(event, args.handlers);
  } finally {
    reader.releaseLock();
  }
}

// ── Action execution (POST /api/agency/:id/ai-hub/actions/execute) ───────────

export interface ExecuteActionArgs {
  agencyId: string;
  workItemId: string;
  action: BackendActionProposalAction;
  reason?: string;
  signal?: AbortSignal;
}

/**
 * Execute a confirmed action proposal. Throws on non-2xx (the caller shows an
 * inline error on the ActionProposalCard and offers retry).
 */
export async function executeAction(args: ExecuteActionArgs): Promise<unknown> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/actions/execute`;
  const body: Record<string, unknown> = {
    workItemId: args.workItemId,
    action: args.action,
  };
  if (args.reason) body.reason = args.reason;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) {
    let message = `execute action ${res.status}`;
    try {
      const err = (await res.json()) as Record<string, unknown>;
      if (typeof err.error === 'string') message = err.error;
      else if (typeof err.message === 'string') message = err.message;
    } catch {
      // ignore parse error — use default message
    }
    throw new Error(message);
  }
  return res.json();
}

// ── Daily briefing (GET /api/agency/:id/ai-hub/briefing) ─────────────────────
//
// The briefing endpoint is being built by a sibling effort, so the mapper is
// deliberately TOLERANT: it accepts a `sections[]` payload if present, can
// synthesize sections from the chat snapshot shape otherwise, and returns
// `null` for anything unusable — the hook then keeps the mock briefing
// (fail-open: this PR ships independently of the backend).

/** Loose mirror of the (in-progress) backend briefing payload. */
export interface BackendBriefingSection {
  id?: string;
  title?: string;
  icon?: string;
  color?: string;
  summary?: string;
  details?: string[];
  actionLabel?: string;
  actionContext?: string;
}

export interface BackendBriefing {
  id?: string;
  greeting?: string;
  overallSummary?: string;
  sections?: BackendBriefingSection[];
  snapshot?: BackendSnapshot | null;
  generatedAt?: string;
}

/** Icons that BriefingCard's ICON_MAP can actually render (unknown → no icon). */
const SAFE_BRIEFING_ICONS = new Set([
  'CurrencyDollar',
  'FunnelSimple',
  'Wrench',
  'FileText',
  'ChatCircle',
  'ChartBar',
  'ListChecks',
]);

const SAFE_BRIEFING_COLORS = new Set([
  'emerald',
  'blue',
  'amber',
  'purple',
  'pink',
  'indigo',
]);

/** Default icon/color per well-known section id (cobranza-centric roster). */
const SECTION_DEFAULTS: Record<string, { icon: string; color: string }> = {
  cobros: { icon: 'CurrencyDollar', color: 'emerald' },
  cobranza: { icon: 'CurrencyDollar', color: 'emerald' },
  escalaciones: { icon: 'ChatCircle', color: 'amber' },
  prejuridico: { icon: 'FileText', color: 'purple' },
  llamadas: { icon: 'ChartBar', color: 'blue' },
};

function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function greetingForHour(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Map one backend section if it has the minimum usable shape (title+summary). */
function mapBriefingSection(raw: BackendBriefingSection): BriefingSection | null {
  if (typeof raw?.title !== 'string' || typeof raw?.summary !== 'string') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : raw.title.toLowerCase();
  const defaults = SECTION_DEFAULTS[id] ?? { icon: 'ListChecks', color: 'blue' };
  return {
    id,
    title: raw.title,
    icon:
      typeof raw.icon === 'string' && SAFE_BRIEFING_ICONS.has(raw.icon)
        ? raw.icon
        : defaults.icon,
    color:
      typeof raw.color === 'string' && SAFE_BRIEFING_COLORS.has(raw.color)
        ? raw.color
        : defaults.color,
    summary: raw.summary,
    details: Array.isArray(raw.details)
      ? raw.details.filter((d): d is string => typeof d === 'string')
      : [],
    ...(typeof raw.actionLabel === 'string' ? { actionLabel: raw.actionLabel } : {}),
    ...(typeof raw.actionContext === 'string'
      ? { actionContext: raw.actionContext }
      : {}),
  };
}

/** Synthesize briefing sections from the chat snapshot (real "Hoy" numbers). */
export function sectionsFromSnapshot(snapshot: BackendSnapshot): BriefingSection[] {
  const sections: BriefingSection[] = [
    {
      id: 'cobros',
      title: 'Cobranza',
      icon: 'CurrencyDollar',
      color: 'emerald',
      summary: `${formatCop(snapshot.pagadoHoyCop)} recaudados hoy · ${snapshot.deudoresActivos} deudores en gestión.`,
      details: [`Llamadas realizadas hoy: ${snapshot.llamadasHoy}.`],
      actionLabel: 'Cuéntame más sobre cobranza',
      actionContext:
        '¿Cómo va la cobranza hoy y qué acciones recomiendas para los deudores en gestión?',
    },
  ];
  if (snapshot.escalacionesPendientes > 0) {
    sections.push({
      id: 'escalaciones',
      title: 'Escalaciones',
      icon: 'ChatCircle',
      color: 'amber',
      summary: `${snapshot.escalacionesPendientes} escalaciones esperando atención de tu equipo.`,
      details: [],
      actionLabel: 'Ver escalaciones pendientes',
      actionContext: '¿Qué escalaciones tengo pendientes y cuáles son las más urgentes?',
    });
  }
  if (snapshot.enPrejuridico > 0) {
    sections.push({
      id: 'prejuridico',
      title: 'Prejurídico',
      icon: 'FileText',
      color: 'purple',
      summary: `${snapshot.enPrejuridico} deudores en etapa prejurídica o posterior.`,
      details: [],
      actionLabel: 'Revisar casos prejurídicos',
      actionContext: '¿Cuál es el estado de los deudores en etapa prejurídica?',
    });
  }
  return sections;
}

/**
 * Tolerant backend → `DailyBriefing` mapper. Returns `null` when the payload
 * has neither usable sections nor a snapshot (caller keeps the mock briefing).
 */
export function mapBackendBriefing(raw: unknown): DailyBriefing | null {
  if (!raw || typeof raw !== 'object') return null;
  const briefing = raw as BackendBriefing;

  const mappedSections = Array.isArray(briefing.sections)
    ? briefing.sections
        .map(mapBriefingSection)
        .filter((s): s is BriefingSection => s !== null)
    : [];
  const sections =
    mappedSections.length > 0
      ? mappedSections
      : briefing.snapshot
        ? sectionsFromSnapshot(briefing.snapshot)
        : [];
  if (sections.length === 0) return null;

  const generatedAt = briefing.generatedAt ?? briefing.snapshot?.generatedAt;
  const parsedDate = generatedAt ? new Date(generatedAt) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return {
    id:
      typeof briefing.id === 'string' && briefing.id
        ? briefing.id
        : `brief_real_${date.toISOString().slice(0, 10)}`,
    date,
    greeting:
      typeof briefing.greeting === 'string' && briefing.greeting
        ? briefing.greeting
        : `${greetingForHour(date)}, este es el resumen de tu inmobiliaria hoy.`,
    overallSummary:
      typeof briefing.overallSummary === 'string' && briefing.overallSummary
        ? briefing.overallSummary
        : sections.map((s) => s.summary).join(' '),
    sections,
    isNew: true,
  };
}

/**
 * Fetch today's real briefing. Fail-open by design: any non-OK status (404
 * while the endpoint ships, 5xx), network error, or unusable payload resolves
 * to `null` — never throws — so the caller can keep its mock briefing.
 */
export async function fetchBriefing(args: {
  agencyId: string;
  signal?: AbortSignal;
}): Promise<DailyBriefing | null> {
  try {
    const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/briefing`;
    const res = await fetch(url, {
      method: 'GET',
      headers: agentAuthHeaders(),
      ...(args.signal ? { signal: args.signal } : {}),
    });
    if (!res.ok) return null;
    return mapBackendBriefing(await res.json());
  } catch {
    return null;
  }
}
