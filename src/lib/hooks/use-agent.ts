'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { AgentExecutionTrace, ExecutionStep } from '@/lib/types/ai-agents';

// =============================================================================
// Types
// =============================================================================

/** Response from POST /evaluations/:applicationId */
interface EvaluationStartResponse {
  runId: string;
  status: 'PENDING';
}

/** Response from GET /evaluations/:applicationId/result */
interface EvaluationResultResponse {
  runId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
}

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

// =============================================================================
// Polling helper
// =============================================================================

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes max

async function pollEvaluationResult(
  applicationId: string,
  onStepProgress: (stepIndex: number) => void,
): Promise<EvaluationResultResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await apiClient.get<EvaluationResultResponse>(
      `/evaluations/${applicationId}/result`,
    );

    if (res.status === 'COMPLETED' || res.status === 'FAILED') {
      return res;
    }

    // Simulate step progression while polling
    const progressStep = Math.min(1 + Math.floor(attempt / 3), 5);
    onStepProgress(progressStep);

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Tiempo de espera agotado. Intenta de nuevo mas tarde.');
}

// =============================================================================
// Hook: useAgentExecution
// =============================================================================

/**
 * Hook for executing AI agent evaluations via the NestJS backend.
 *
 * Scoring: POST /evaluations/:applicationId → polls GET /evaluations/:applicationId/result
 * Matching: Not yet proxied through backend — shows coming soon message.
 */
export function useAgentExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(null);

  const runScoring = useCallback(
    async (applicationId: string, _agencyId: string) => {
      setIsRunning(true);
      setError(null);
      setResult(null);

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

      try {
        // Step 1: Request evaluation
        updateStepStatus(steps, 0, 'running');
        setTrace((t) => t ? { ...t, steps: [...steps] } : null);

        const startTime = Date.now();

        const startRes = await apiClient.post<EvaluationStartResponse>(
          `/evaluations/${applicationId}`,
        );

        updateStepStatus(steps, 0, 'completed');
        updateStepStatus(steps, 1, 'running');
        setTrace((t) => t ? { ...t, steps: [...steps] } : null);

        // Step 2-6: Poll for result (agent processes async)
        const evalResult = await pollEvaluationResult(
          applicationId,
          (stepIdx) => {
            // Update trace steps as we poll
            for (let i = 1; i < stepIdx; i++) {
              if (steps[i].status !== 'completed') {
                updateStepStatus(steps, i, 'completed');
              }
            }
            if (stepIdx < steps.length) {
              updateStepStatus(steps, stepIdx, 'running');
            }
            setTrace((t) => t ? { ...t, steps: [...steps] } : null);
          },
        );

        const durationMs = Date.now() - startTime;

        if (evalResult.status === 'FAILED') {
          throw new Error(evalResult.error || 'La evaluación falló');
        }

        // Mark all steps as completed
        steps.forEach((_, i) => updateStepStatus(steps, i, 'completed'));

        // Map the evaluation result to the expected ScoringResult shape
        const data = evalResult.result ?? {};
        const scoringResult: ScoringResult = {
          success: true,
          applicationId,
          score: (data.score as number) ?? 0,
          level: (data.level as ScoringResult['level']) ?? 'D',
          recommendation: (data.recommendation as string) ?? '',
          explanation: (data.explanation as string) ?? '',
          escalate: (data.escalate as boolean) ?? false,
          escalateReason: data.escalateReason as string | undefined,
          storedSuccessfully: true,
        };

        // Add output to trace steps
        if (scoringResult.score !== undefined) {
          steps[3].output = `Score: ${scoringResult.score}/100 — Nivel ${scoringResult.level}`;
          steps[4].output = scoringResult.explanation;
          steps[5].output = 'Resultado guardado en la base de datos';
        }

        setResult(scoringResult);
        setTrace({
          id: traceId,
          agentId: 'tenant-scoring',
          title: `Evaluación ${applicationId}`,
          status: 'completed',
          steps,
          totalDurationMs: durationMs,
          conclusion: scoringResult.recommendation,
          result: `${scoringResult.score}/100 (${scoringResult.level})`,
          createdAt: new Date(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);

        const runningIdx = steps.findIndex((s) => s.status === 'running');
        if (runningIdx >= 0) updateStepStatus(steps, runningIdx, 'failed');

        setTrace((t) => t ? { ...t, status: 'failed', steps: [...steps] } : null);
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  const runMatching = useCallback(
    async (
      applicationId: string,
      _agencyId: string,
      _trigger: string = 'new_application',
    ) => {
      // Smart matching is not yet proxied through the NestJS backend.
      // TODO: Add POST /evaluations/:applicationId/matching endpoint to backend
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
        setTrace((t) => t ? { ...t, steps: [...steps] } : null);

        // For now, show a clear message that this endpoint is pending backend integration
        throw new Error(
          'Smart Matching aún no está disponible. Próximamente será habilitado desde el backend.',
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);

        const runningIdx = steps.findIndex((s) => s.status === 'running');
        if (runningIdx >= 0) updateStepStatus(steps, runningIdx, 'failed');

        setTrace((t) => t ? { ...t, status: 'failed', steps: [...steps] } : null);
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
    { id: 's1', label: 'Solicitar evaluación', stepType: 'api', status: 'pending' },
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
