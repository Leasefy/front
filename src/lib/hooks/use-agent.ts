'use client';

import { useState, useCallback } from 'react';
import type { AgentExecutionTrace, ExecutionStep } from '@/lib/types/ai-agents';
import { agentAuthHeaders } from '@/lib/api/agent-auth';

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

// =============================================================================
// Hook: useAgentExecution
// =============================================================================

export function useAgentExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(null);

  const runScoring = useCallback(
    async (applicationId: string, agencyId: string) => {
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

      try {
        // Simulate step progression for UI feedback
        updateStepStatus(steps, 0, 'running');
        setTrace((t) => t ? { ...t, steps: [...steps] } : null);

        const startTime = Date.now();

        const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || ''
        const res = await fetch(`${agentUrl}/tenant-scoring`, {
          method: 'POST',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ applicationId, agencyId }),
        });

        const data = await res.json();
        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          throw new Error(data.error || data.details || 'Scoring failed');
        }

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

        setResult(data as ScoringResult);
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
        setTrace((t) => t ? { ...t, steps: [...steps] } : null);

        const startTime = Date.now();

        const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || ''
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
            .map((s: { title: string; compatibility: number }) =>
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
