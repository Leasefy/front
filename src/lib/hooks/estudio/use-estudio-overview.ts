'use client'

/**
 * use-estudio-overview.ts — Tier-B estudio UX (overview/Sala data).
 *
 * Thin estudio-scoped wrapper over the generic, already-wired
 * `useAgentOverview('estudio')` (GET /api/agency/{id}/ai-hub/agentes/estudio/overview).
 * Keeps the bespoke overview page decoupled from the generic hook name and gives
 * us a single seam to swap to a dedicated estudio endpoint later without touching
 * the page. 404 → `notAvailable` (endpoint not deployed) per the generic hook.
 */

import {
  useAgentOverview,
  type UseAgentOverviewResult,
} from '@/lib/hooks/ai/use-agent-overview'

export type UseEstudioOverviewResult = UseAgentOverviewResult

export function useEstudioOverview(): UseEstudioOverviewResult {
  return useAgentOverview('estudio')
}
