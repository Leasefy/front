'use client';

/**
 * ai-hub-lessons — browser client for the agency AI chat "self-learning
 * lessons" certification fence (F3).
 *
 * Wires the front to the agent service's chat-lessons endpoints:
 *   GET  /api/agency/:agencyId/ai-hub/chat/lessons
 *   POST /api/agency/:agencyId/ai-hub/chat/lessons/:lessonId/certify
 *
 * Auth = Supabase bearer via agentAuthHeaders(); base URL = NEXT_PUBLIC_AGENT_URL.
 * Mirrors src/lib/api/ai-hub-chat.ts's network/error/base-url conventions
 * exactly (agentBaseUrl / isAgentConfigured / `Error(... <status>)` on non-OK).
 *
 * Each lesson is a human-readable Spanish heuristic the assistant has learned
 * from usage (routing or approval). A lesson stays a `candidate` until a human
 * with OPERATOR+ role certifies it. The fence is fail-closed: even a human
 * certify can be rejected by the backend (`applied: false` + a `reason`) when
 * the evidence is too thin — the UI MUST surface that reason.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';

// ── Backend contract (mirror of the agent's agency-ai-hub chat-lessons) ──────

export type ChatLessonKind = 'routing' | 'approval';

export type ChatLessonStatus = 'candidate' | 'certified' | 'rejected';

/** Agents a lesson can concern (matches the chat dispatch roster). */
export type ChatLessonAgent =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'avaluo'
  | 'conciliacion'
  | 'pagos';

export interface ChatLessonPattern {
  /** The agent the lesson concerns, or `null` for a global heuristic. */
  agent: ChatLessonAgent | string | null;
  tags: string[];
}

export interface ChatLessonEvidence {
  /** How many observations back this lesson. */
  support: number;
  /** Approval lessons only: how many were approved / rejected. */
  approved?: number;
  rejected?: number;
  /** ISO timestamp of the last observation. */
  lastSeen: string;
  /** A representative question that triggered this lesson. */
  sampleQuestion: string;
}

export interface ChatLesson {
  id: string;
  kind: ChatLessonKind;
  pattern: ChatLessonPattern;
  /** The human-readable Spanish heuristic — the PRIMARY text to show. */
  recommendation: string;
  status: ChatLessonStatus;
  evidence: ChatLessonEvidence;
  createdAt: string;
  updatedAt: string;
}

export interface ChatLessonsResponse {
  lessons: ChatLesson[];
  /**
   * Master switch: whether certified lessons are actually applied to the chat.
   * When false, certified lessons exist but are NOT yet influencing routing.
   */
  enabled: boolean;
  generatedAt: string;
}

export type CertifyDecision = 'certified' | 'rejected';

export interface CertifyLessonResponse {
  lessonId: string;
  decision: CertifyDecision;
  /** Whether the lesson id existed. */
  found: boolean;
  /**
   * Whether the decision was actually applied. Fail-closed fence: certifying a
   * thinly-evidenced lesson returns `applied: false` with a `reason`. Rejecting
   * is always applied.
   */
  applied: boolean;
  /** Human-readable reason — populated (and surfaced) when `applied: false`. */
  reason: string;
  resolvedAt: string;
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

/** Fetch the agency's chat lessons. Throws on non-OK (caller surfaces it). */
export async function getChatLessons(
  agencyId: string,
  signal?: AbortSignal,
): Promise<ChatLessonsResponse> {
  const url = `${agentBaseUrl()}/api/agency/${agencyId}/ai-hub/chat/lessons`;
  const res = await fetch(url, {
    method: 'GET',
    headers: agentAuthHeaders(),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`ai-hub chat lessons ${res.status}`);
  return (await res.json()) as ChatLessonsResponse;
}

/**
 * Certify (or reject) a candidate lesson.
 *
 * Returns the backend's verdict verbatim. The caller MUST inspect `applied`:
 * a certify that hit the fail-closed fence resolves with `applied: false` and a
 * `reason` (NOT an HTTP error). A non-OK status (e.g. 403 for VIEWER) throws.
 */
export async function certifyChatLesson(args: {
  agencyId: string;
  lessonId: string;
  decision: CertifyDecision;
  signal?: AbortSignal;
}): Promise<CertifyLessonResponse> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/lessons/${args.lessonId}/certify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ decision: args.decision }),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) throw new Error(`ai-hub chat lessons certify ${res.status}`);
  return (await res.json()) as CertifyLessonResponse;
}
