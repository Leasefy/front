'use client'

/**
 * use-estudios-list.ts — Tier-B estudio UX (list/inbox data).
 *
 * Thin estudio-scoped wrapper over the generic, already-wired
 * `useAgentWorkItems('estudio')` (GET /api/agency/{id}/ai-hub/work-items?agente=estudio).
 * Exposes the human-queue WorkItem[] for the "Estudios / Qué necesita tu atención"
 * inbox. 404 → friendly empty (no error) per the generic hook.
 */

import {
  useAgentWorkItems,
  type AgentWorkItemsFilters,
  type UseAgentWorkItemsResult,
} from '@/lib/hooks/ai/use-agent-work-items'

export type UseEstudiosListResult = UseAgentWorkItemsResult

export function useEstudiosList(filters?: AgentWorkItemsFilters): UseEstudiosListResult {
  return useAgentWorkItems('estudio', filters)
}
