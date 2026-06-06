'use client';

import { useState, useCallback } from 'react';
import type { AgentExecutionTrace, ExecutionStep } from '@/lib/types/ai-agents';
import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { apiClient } from '@/lib/api/client';
import { applicationsApi, landlordApplicationsApi } from '@/lib/api/applications.service';
import type { BackendApplication } from '@/lib/api/applications.types';

// =============================================================================
// Types
// =============================================================================

interface ScoringResult {
  success: boolean;
  applicationId: string;
  score: number;
  level: 'A' | 'B' | 'C' | 'D';
  recommendation: string;
  explanation: string;
  escalate: boolean;
  escalateReason?: string;
  storedSuccessfully: boolean;
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

/** Document type as required by the tenant-scoring agent (see agent/src/server/routes/tenant-scoring.ts). */
type AgentDocumentType =
  | 'cedula'
  | 'extracto_bancario'
  | 'contrato_laboral'
  | 'certificado_ingresos'
  | 'nomina'
  | 'reporte_credito';

interface AgentDocument {
  url: string;
  type: AgentDocumentType;
}

/** Body accepted by POST /tenant-scoring (tenantScoringBody). */
interface ScoringPayload {
  applicationId: string;
  tenantId: string;
  monthlyRent: number;
  documents: AgentDocument[];
}

// Polling configuration for the 202-then-poll flow.
const POLL_INTERVAL_MS = 1800;
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes — matches the < 3min scoring target.

// =============================================================================
// Document type mapping
// =============================================================================

/**
 * Maps the backend's canonical UPPER_SNAKE document types (ID_DOCUMENT,
 * BANK_STATEMENT, …) to the agent's lowercase enum. Documents whose type has no
 * mapping (e.g. unknown / unsupported) are dropped — the agent only scores the
 * six recognised types.
 */
const DOC_TYPE_TO_AGENT: Record<string, AgentDocumentType> = {
  ID_DOCUMENT: 'cedula',
  BANK_STATEMENT: 'extracto_bancario',
  BANK_STATEMENTS: 'extracto_bancario', // legacy fallback
  EMPLOYMENT_LETTER: 'contrato_laboral',
  INCOME_PROOF: 'certificado_ingresos',
  PAY_STUB: 'nomina',
  CREDIT_REPORT: 'reporte_credito',
};

function mapDocType(backendType: string): AgentDocumentType | null {
  return DOC_TYPE_TO_AGENT[backendType] ?? null;
}

// =============================================================================
// Document resolver
// =============================================================================

/**
 * Builds the tenant-scoring payload for an application:
 *   - tenantId + monthlyRent come from the application record
 *   - documents[] are resolved to short-lived signed download URLs
 *
 * Throws a clear error when the application has zero usable documents, since the
 * agent rejects an empty `documents` array (min(1)).
 */
async function resolveScoringPayload(applicationId: string): Promise<ScoringPayload> {
  // Application metadata (raw backend shape — the mapped `Application` type drops
  // tenantId and monthlyRent, both of which the agent requires).
  const application = await apiClient.get<BackendApplication>(`/applications/${applicationId}`);

  const tenantId = application.tenantId;
  const monthlyRent = application.property?.monthlyRent;

  if (!tenantId) {
    throw new Error('La aplicación no tiene un inquilino asociado.');
  }
  if (!monthlyRent || monthlyRent <= 0) {
    throw new Error('La aplicación no tiene un canon (monthlyRent) válido para evaluar.');
  }

  const backendDocs = await applicationsApi.getDocuments(applicationId);

  // Keep only documents the agent understands, then resolve a signed URL for each.
  const mappable = backendDocs
    .map((doc) => ({ doc, agentType: mapDocType(doc.type) }))
    .filter((entry): entry is { doc: typeof backendDocs[number]; agentType: AgentDocumentType } =>
      entry.agentType !== null,
    );

  if (mappable.length === 0) {
    throw new Error(
      'La aplicación no tiene documentos para evaluar. Sube cédula, extracto bancario o certificación laboral antes de ejecutar el agente.',
    );
  }

  const resolved = await Promise.all(
    mappable.map(async ({ doc, agentType }) => {
      // Prefer a freshly-signed URL; fall back to any URL already on the document.
      let url = doc.url;
      try {
        const signed = await landlordApplicationsApi.getDocumentDownloadUrl(applicationId, doc.id);
        url = signed.url;
      } catch {
        // Signed-URL resolution failed — fall through to doc.url below.
      }
      if (!url) return null;
      return { url, type: agentType } satisfies AgentDocument;
    }),
  );

  const documents = resolved.filter((d): d is AgentDocument => d !== null);

  if (documents.length === 0) {
    throw new Error(
      'No se pudo obtener un enlace de descarga para los documentos de la aplicación.',
    );
  }

  return { applicationId, tenantId, monthlyRent, documents };
}

// =============================================================================
// Hook: useAgentExecution
// =============================================================================

export function useAgentExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(null);

  const runScoring = useCallback(async (applicationId: string) => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    // Build execution trace for UI
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
      // Step 1 — resolve the application + documents into the agent payload.
      updateStepStatus(steps, 0, 'running');
      setTrace((t) => (t ? { ...t, steps: [...steps] } : null));

      const payload = await resolveScoringPayload(applicationId);

      updateStepStatus(steps, 0, 'completed');
      updateStepStatus(steps, 1, 'running');
      setTrace((t) => (t ? { ...t, steps: [...steps] } : null));

      // Step 2 — dispatch the scoring request.
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || '';
      const res = await fetch(`${agentUrl}/tenant-scoring`, {
        method: 'POST',
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      const dispatch = await res.json();

      if (!res.ok) {
        throw new Error(dispatch.error || dispatch.details || 'Scoring failed');
      }

      // The POST returns either a cached completed run (fromCache=true) or a 202
      // with a runId we then poll until completed/failed.
      let data: ScoringResult;
      if (dispatch.fromCache && dispatch.data) {
        data = dispatch.data as ScoringResult;
      } else {
        const runId: string | undefined = dispatch.runId;
        if (!runId) {
          throw new Error('El agente no devolvió un runId para hacer seguimiento.');
        }
        data = await pollScoringRun(agentUrl, runId);
      }

      const durationMs = Date.now() - startTime;

      // Mark all steps as completed
      steps.forEach((_, i) => updateStepStatus(steps, i, 'completed'));

      // Add result details to relevant steps
      if (data.score !== undefined) {
        steps[3].output = `Score: ${data.score}/100 — Nivel ${data.level}`;
        steps[4].output = data.explanation;
        steps[5].output = data.storedSuccessfully
          ? 'Resultado guardado en la base de datos'
          : 'Error al guardar';
      }

      setResult(data);
      setTrace({
        id: traceId,
        agentId: 'tenant-scoring',
        title: `Evaluación ${applicationId}`,
        status: 'completed',
        steps,
        totalDurationMs: durationMs,
        conclusion: data.recommendation,
        result: `${data.score}/100 (${data.level})`,
        createdAt: new Date(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);

      // Mark current step as failed
      const runningIdx = steps.findIndex((s) => s.status === 'running');
      if (runningIdx >= 0) updateStepStatus(steps, runningIdx, 'failed');

      setTrace((t) => (t ? { ...t, status: 'failed', steps: [...steps] } : null));
    } finally {
      setIsRunning(false);
    }
  }, []);

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

        const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || '';
        const res = await fetch(`${agentUrl}/smart-matching`, {
          method: 'POST',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ applicationId, agencyId, trigger }),
        });

        const data = await res.json();
        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          throw new Error(data.error || data.details || 'Matching failed');
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
    runScoring,
    runMatching,
    clearResult: () => {
      setResult(null);
      setTrace(null);
      setError(null);
    },
  };
}

// =============================================================================
// Polling
// =============================================================================

/**
 * Polls GET /tenant-scoring/:runId every ~1.8s until the run reaches a terminal
 * state. Resolves with the scoring result on `completed`; throws on `failed` or
 * when the timeout elapses.
 */
async function pollScoringRun(agentUrl: string, runId: string): Promise<ScoringResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(`${agentUrl}/tenant-scoring/${runId}`, {
      method: 'GET',
      headers: agentAuthHeaders(),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || `No se pudo consultar el estado (${res.status}).`);
    }

    const status: string | undefined = body.status;

    if (status === 'completed') {
      if (!body.data) {
        throw new Error('La evaluación terminó pero no devolvió resultados.');
      }
      return body.data as ScoringResult;
    }

    if (status === 'failed') {
      throw new Error(body.error || 'La evaluación falló.');
    }

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
