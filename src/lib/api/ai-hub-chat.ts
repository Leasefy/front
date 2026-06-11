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
} from '@/lib/types/beta-chat';

// ── Backend contract (mirror of the agent's agency-ai-hub-chat[-stream]) ──────

export type BackendDispatchAgent =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching';

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
