'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentExecutionTrace, ExecutionStep, ScoringAwaitingReason } from '@/lib/types/ai-agents';
import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { apiClient } from '@/lib/api/client';
// CreditCheck types live in applications.types (canonical location) to avoid
// circular deps (CandidateDrawer → applications.service → applications.types).
// Re-exported here so AIAgentCard.tsx can keep importing from use-agent.
import type { CreditCheck } from '@/lib/api/applications.types';
export type { CreditCheck, CreditCheckStatus, CreditCheckReasonCode } from '@/lib/api/applications.types';

// =============================================================================
// Types — Tenant scoring (evaluations module on the main backend)
// =============================================================================
//
// The front talks ONLY to the main backend (Leasefy/back), never to the agent
// micro directly. The backend proxies the agent micro and owns ownership,
// subscription/credits, idempotency, signed URLs and persistence. Contract:
//   POST /evaluations/:applicationId            → 202 { runId, status: 'PENDING' }
//   GET  /evaluations/:applicationId/result     → EvaluationResponseDto
// See docs/AI_AGENTS_ARCHITECTURE.md / FRONTEND-API-CONTRACTS.md.

export interface ScoreBreakdown {
  financial: number;
  stability: number;
  history: number;
  integrity: number;
  payment_history: number;
}


export interface EvaluationObservation {
  doc_type: string;
  code: string;
  severity: 'info' | 'warning';
  emission_date?: string;
  message: string;
}

export interface IntegrityFlag {
  doc_type: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
  source: 'metadata' | 'cross_validation' | 'visual';
  detail: string;
}

export interface DocumentsSummary {
  total_sent: number;
  processed: number;
  skipped?: number;
  types_present: string[];
}

/** Completed evaluation — surfaced as the hook `result`. */
export interface ScoringResult {
  runId: string;
  score: number;
  level: 'A' | 'B' | 'C' | 'D';
  scoreBreakdown?: ScoreBreakdown;
  observations?: EvaluationObservation[];
  integrityFlags?: IntegrityFlag[];
  documentsSummary?: DocumentsSummary;
  explanation?: string;
  requiresManualReview?: boolean;
  createdAt?: string;
  /** Credit bureau check result. Present when backend returns it (COMPLETED/FAILED only). */
  creditCheck?: CreditCheck;
}

interface MatchingResult {
  success: boolean;
  applicationId: string;
  candidateName: string;
  suggestionsCount: number;
  suggestions: {
    propertyId: string;
    title: string;
    zone: string;
    price: number;
    compatibility: number;
    mainReason: string;
  }[];
  candidateNotified: boolean;
  agentNotified: boolean;
  trigger: string;
}

type AgentResult = ScoringResult | MatchingResult;

/** Raw EvaluationResponseDto returned by GET /evaluations/:applicationId/result. */
interface EvaluationResponse {
  runId: string;
  status: 'PENDING' | 'AWAITING_EVALUATION' | 'COMPLETED' | 'FAILED';
  awaiting_reason?: ScoringAwaitingReason;
  score?: number;
  level?: 'A' | 'B' | 'C' | 'D';
  score_breakdown?: ScoreBreakdown;
  observations?: EvaluationObservation[];
  integrity_flags?: IntegrityFlag[];
  documents_summary?: DocumentsSummary;
  explanation?: string;
  requires_manual_review?: boolean;
  error?: string;
  createdAt?: string;
  /**
   * Credit bureau check — present only when status is COMPLETED or FAILED.
   * Top-level key is snake_case; inner keys are camelCase (backend asymmetry).
   * Absent on old evaluations and during PENDING/AWAITING_EVALUATION.
   */
  credit_check?: CreditCheck;
}

/** 202 response from POST /evaluations/:applicationId. */
interface EvaluationDispatchResponse {
  runId?: string;
  status?: string;
}

/** Awaiting state stored in hook when the poll returns AWAITING_EVALUATION. */
export interface ScoringAwaitingState {
  reason: ScoringAwaitingReason;
  documentsSummary?: DocumentsSummary;
  runId: string;
}

/** Discriminated union returned by pollEvaluation. */
type ScoringPollResult =
  | { kind: 'completed'; data: ScoringResult }
  | { kind: 'awaiting'; reason: ScoringAwaitingReason; documentsSummary?: DocumentsSummary };

// Polling configuration.
const POLL_INTERVAL_MS = 1800; // active poll while PENDING
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes — only applies to PENDING
const BACKGROUND_POLL_INTERVAL_MS = 20_000; // slow re-poll for AWAITING_EVALUATION + study_in_progress

// =============================================================================
// Result mapping
// =============================================================================

/** Maps the snake_case EvaluationResponseDto score payload into ScoringResult. */
function toScoringResult(body: EvaluationResponse): ScoringResult {
  return {
    runId: body.runId,
    score: body.score ?? 0,
    level: body.level ?? 'D',
    scoreBreakdown: body.score_breakdown,
    observations: body.observations,
    integrityFlags: body.integrity_flags,
    documentsSummary: body.documents_summary,
    explanation: body.explanation,
    requiresManualReview: body.requires_manual_review,
    createdAt: body.createdAt,
    // credit_check is top-level snake_case; inner keys stay camelCase as received.
    // Absent on old evaluations → leave creditCheck undefined (no default).
    creditCheck: body.credit_check,
  };
}

// =============================================================================
// Hook: useAgentExecution
// =============================================================================

export function useAgentExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(null);
  const [awaiting, setAwaiting] = useState<ScoringAwaitingState | null>(null);

  // Holds the applicationId so recheckScoring / background poll can re-query the result.
  const awaitingAppIdRef = useRef<string | null>(null);
  // Holds the background poll interval id.
  const bgPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearBgPoll = useCallback(() => {
    if (bgPollIntervalRef.current !== null) {
      clearInterval(bgPollIntervalRef.current);
      bgPollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearBgPoll();
    };
  }, [clearBgPoll]);

  // ── Background slow re-poll (AWAITING_EVALUATION + study_in_progress) ───────
  const startBackgroundPoll = useCallback(
    (applicationId: string) => {
      clearBgPoll();
      bgPollIntervalRef.current = setInterval(() => {
        void (async () => {
          try {
            const body = await apiClient.get<EvaluationResponse>(`/evaluations/${applicationId}/result`);

            if (body.status === 'COMPLETED') {
              clearBgPoll();
              awaitingAppIdRef.current = null;
              setAwaiting(null);
              setResult(toScoringResult(body));
              setTrace((t) => (t ? { ...t, status: 'completed' } : null));
            } else if (body.status === 'FAILED') {
              clearBgPoll();
              awaitingAppIdRef.current = null;
              setAwaiting(null);
              setError(body.error ?? 'La evaluación falló.');
              setTrace((t) => (t ? { ...t, status: 'failed' } : null));
            } else if (body.status === 'AWAITING_EVALUATION') {
              const reason = (body.awaiting_reason ?? 'study_in_progress') as ScoringAwaitingReason;
              if (reason !== 'study_in_progress') {
                // Transitioned to a terminal awaiting reason (e.g. study expired) — stop polling.
                clearBgPoll();
                setAwaiting((a) =>
                  a ? { ...a, reason, documentsSummary: body.documents_summary ?? a.documentsSummary } : a,
                );
              }
              // else: still in progress — keep polling
            }
          } catch {
            // Network error on background poll — swallow and retry next tick.
          }
        })();
      }, BACKGROUND_POLL_INTERVAL_MS);
    },
    [clearBgPoll],
  );

  // ── recheckScoring — manual re-query of the stored application result ───────
  const recheckScoring = useCallback(async () => {
    const applicationId = awaitingAppIdRef.current;
    if (!applicationId) return;

    try {
      const body = await apiClient.get<EvaluationResponse>(`/evaluations/${applicationId}/result`);

      if (body.status === 'COMPLETED') {
        clearBgPoll();
        awaitingAppIdRef.current = null;
        setAwaiting(null);
        setResult(toScoringResult(body));
        setTrace((t) => (t ? { ...t, status: 'completed' } : null));
      } else if (body.status === 'FAILED') {
        clearBgPoll();
        awaitingAppIdRef.current = null;
        setAwaiting(null);
        setError(body.error ?? 'La evaluación falló.');
        setTrace((t) => (t ? { ...t, status: 'failed' } : null));
      } else if (body.status === 'AWAITING_EVALUATION') {
        const reason = (body.awaiting_reason ?? 'study_in_progress') as ScoringAwaitingReason;
        setAwaiting((a) =>
          a ? { ...a, reason, documentsSummary: body.documents_summary ?? a.documentsSummary } : a,
        );
        if (reason !== 'study_in_progress') clearBgPoll();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al verificar el estado.';
      setError(msg);
    }
  }, [clearBgPoll]);

  const runScoring = useCallback(
    async (applicationId: string) => {
      setIsRunning(true);
      setError(null);
      setResult(null);
      setAwaiting(null);
      clearBgPoll();
      awaitingAppIdRef.current = null;

      // Build execution trace for UI.
      const traceId = `trace-${Date.now()}`;
      const steps = buildScoringSteps();
      setTrace({
        id: traceId,
        agentId: 'tenant-scoring',
        title: `Evaluación ${applicationId}`,
        status: 'running',
        steps,
        createdAt: new Date(),
      });

      const startTime = Date.now();

      try {
        // Step 1 — dispatch the evaluation. No body: the backend resolves
        // documents/signed URLs/candidate/property and validates ownership,
        // subscription and credits before launching the agent micro.
        updateStepStatus(steps, 0, 'running');
        setTrace((t) => (t ? { ...t, steps: [...steps] } : null));

        const dispatch = await apiClient.post<EvaluationDispatchResponse>(`/evaluations/${applicationId}`);

        updateStepStatus(steps, 0, 'completed');
        updateStepStatus(steps, 1, 'running');
        setTrace((t) => (t ? { ...t, steps: [...steps] } : null));

        // Step 2 — poll the result by applicationId until terminal / awaiting.
        const pollResult = await pollEvaluation(applicationId);

        // ── Handle awaiting result ─────────────────────────────────────────
        if (pollResult.kind === 'awaiting') {
          awaitingAppIdRef.current = applicationId;
          setAwaiting({
            reason: pollResult.reason,
            documentsSummary: pollResult.documentsSummary,
            runId: dispatch.runId ?? '',
          });
          if (pollResult.reason === 'study_in_progress') {
            startBackgroundPoll(applicationId);
          }
          setTrace((t) => (t ? { ...t, status: 'running' } : null));
          return;
        }

        // ── Completed ──────────────────────────────────────────────────────
        const data = pollResult.data;
        const durationMs = Date.now() - startTime;

        steps.forEach((_, i) => updateStepStatus(steps, i, 'completed'));
        steps[3].output = `Score: ${data.score}/100 — Nivel ${data.level}`;
        if (data.explanation) steps[4].output = data.explanation;
        steps[5].output = data.requiresManualReview
          ? 'Requiere revisión manual'
          : 'Resultado disponible';

        setResult(data);
        setTrace({
          id: traceId,
          agentId: 'tenant-scoring',
          title: `Evaluación ${applicationId}`,
          status: 'completed',
          steps,
          totalDurationMs: durationMs,
          conclusion: data.explanation,
          result: `${data.score}/100 (${data.level})`,
          createdAt: new Date(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);

        const runningIdx = steps.findIndex((s) => s.status === 'running');
        if (runningIdx >= 0) updateStepStatus(steps, runningIdx, 'failed');

        setTrace((t) => (t ? { ...t, status: 'failed', steps: [...steps] } : null));
      } finally {
        setIsRunning(false);
      }
    },
    [clearBgPoll, startBackgroundPoll],
  );

  // NOTE: runMatching is intentionally NOT wired into the agent card UI.
  // Per the agent contract, manual smart-matching is not triggered from the card
  // (it runs server-side on application events / crons). It stays exported so that
  // existing mocks/tests keep compiling, but it is out-of-scope for the card.
  const runMatching = useCallback(
    async (
      applicationId: string,
      agencyId: string,
      trigger: string = 'new_application',
    ) => {
      setIsRunning(true);
      setError(null);
      setResult(null);

      const traceId = `trace-${Date.now()}`;
      const steps = buildMatchingSteps();
      setTrace({
        id: traceId,
        agentId: 'smart-matching',
        title: `Matching ${applicationId}`,
        status: 'running',
        steps,
        createdAt: new Date(),
      });

      try {
        updateStepStatus(steps, 0, 'running');
        setTrace((t) => (t ? { ...t, steps: [...steps] } : null));

        const startTime = Date.now();

        const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? '';
        const res = await fetch(`${agentUrl}/smart-matching`, {
          method: 'POST',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ applicationId, agencyId, trigger }),
        });

        const data = await res.json() as MatchingResult & { error?: string; details?: string };
        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          throw new Error(data.error ?? data.details ?? 'Matching failed');
        }

        steps.forEach((_, i) => updateStepStatus(steps, i, 'completed'));

        if (data.suggestions) {
          steps[2].output = `${data.suggestionsCount} propiedades compatibles`;
          steps[3].output = data.suggestions
            .map(
              (s: { title: string; compatibility: number }) =>
                `${s.title} (${s.compatibility}%)`,
            )
            .join(', ');
        }

        setResult(data as MatchingResult);
        setTrace({
          id: traceId,
          agentId: 'smart-matching',
          title: `Matching ${applicationId}`,
          status: 'completed',
          steps,
          totalDurationMs: durationMs,
          conclusion: `${data.suggestionsCount} sugerencias enviadas a ${data.candidateName}`,
          result: `${data.suggestionsCount} matches`,
          createdAt: new Date(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);

        const runningIdx = steps.findIndex((s) => s.status === 'running');
        if (runningIdx >= 0) updateStepStatus(steps, runningIdx, 'failed');

        setTrace((t) => (t ? { ...t, status: 'failed', steps: [...steps] } : null));
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  return {
    isRunning,
    error,
    result,
    trace,
    awaiting,
    recheckScoring,
    runScoring,
    runMatching,
    clearResult: () => {
      clearBgPoll();
      awaitingAppIdRef.current = null;
      setResult(null);
      setTrace(null);
      setError(null);
      setAwaiting(null);
    },
  };
}

// =============================================================================
// Polling
// =============================================================================

/**
 * Polls GET /evaluations/:applicationId/result every ~1.8s until the run reaches
 * a terminal state or AWAITING_EVALUATION.
 *
 * Returns a discriminated union:
 *   - { kind: 'completed', data } on COMPLETED
 *   - { kind: 'awaiting', reason, documentsSummary? } on AWAITING_EVALUATION
 *     (exits immediately, no throw)
 *
 * Throws on FAILED or when the 3-min timeout elapses while still PENDING.
 * AWAITING_EVALUATION is NOT a timeout condition.
 */
async function pollEvaluation(applicationId: string): Promise<ScoringPollResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body = await apiClient.get<EvaluationResponse>(`/evaluations/${applicationId}/result`);

    if (body.status === 'COMPLETED') {
      return { kind: 'completed', data: toScoringResult(body) };
    }

    if (body.status === 'FAILED') {
      throw new Error(body.error ?? 'La evaluación falló.');
    }

    if (body.status === 'AWAITING_EVALUATION') {
      const reason = (body.awaiting_reason ?? 'study_in_progress') as ScoringAwaitingReason;
      return { kind: 'awaiting', reason, documentsSummary: body.documents_summary };
    }

    // PENDING — check the deadline and keep polling.
    if (Date.now() >= deadline) {
      throw new Error('La evaluación superó el tiempo de espera (3 min).');
    }

    await delay(POLL_INTERVAL_MS);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Helpers
// =============================================================================

function updateStepStatus(
  steps: ExecutionStep[],
  index: number,
  status: ExecutionStep['status'],
) {
  if (steps[index]) {
    steps[index] = {
      ...steps[index],
      status,
      ...(status === 'running' ? { startedAt: new Date() } : {}),
      ...(status === 'completed' || status === 'failed'
        ? { completedAt: new Date() }
        : {}),
    };
  }
}

function buildScoringSteps(): ExecutionStep[] {
  return [
    { id: 's1', label: 'Cargar aplicación', stepType: 'api', status: 'pending' },
    { id: 's2', label: 'Extraer documentos (OCR)', stepType: 'analysis', status: 'pending' },
    { id: 's3', label: 'Verificar consistencia', stepType: 'analysis', status: 'pending', reasoning: 'Cruzando datos entre formulario, cédula y certificación laboral' },
    { id: 's4', label: 'Calcular score', stepType: 'decision', status: 'pending' },
    { id: 's5', label: 'Generar explicación', stepType: 'analysis', status: 'pending' },
    { id: 's6', label: 'Guardar resultado', stepType: 'api', status: 'pending' },
    { id: 's7', label: 'Notificar equipo', stepType: 'notification', status: 'pending' },
  ];
}

function buildMatchingSteps(): ExecutionStep[] {
  return [
    { id: 'm1', label: 'Cargar perfil del candidato', stepType: 'api', status: 'pending' },
    { id: 'm2', label: 'Buscar en portafolio', stepType: 'search', status: 'pending' },
    { id: 'm3', label: 'Calcular compatibilidad', stepType: 'analysis', status: 'pending' },
    { id: 'm4', label: 'Seleccionar top 3', stepType: 'decision', status: 'pending' },
    { id: 'm5', label: 'Enviar sugerencias', stepType: 'notification', status: 'pending' },
    { id: 'm6', label: 'Notificar agente de zona', stepType: 'notification', status: 'pending' },
  ];
}
