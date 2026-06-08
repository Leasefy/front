'use client'

/**
 * /ai/matching — F3 of the Agent Workspace initiative.
 *
 * The "Matching" Sala, rendered through the TRANSVERSAL pattern: the unified
 * WorkItem endpoint (`/ai-hub/work-items?agente=matching`) feeds the generic
 * <ColaHumana>. Owned by the comercial role. Each item is a candidate's ranked
 * list of compatible properties; the operator actions (pursues) or discards.
 *
 * Note: smart-matching runs carry no agencyId, so the cola is scoped by agency
 * membership — matches triggered by the backend service won't appear until the
 * pipeline persists agencyId (a backend follow-up).
 */

import { House } from '@phosphor-icons/react'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

export default function MatchingSalaPage() {
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header / Sala */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <House className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Matching
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Cola humana</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Candidatos que el agente emparejó con propiedades compatibles. Revisa la mejor coincidencia
            y sus factores de calce, luego acciónala (para contactar) o descártala. Modo Copiloto: nada
            se hace sin ti.
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            En cola
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        emptyHint="No hay sugerencias de matching pendientes para tu equipo."
      />
    </div>
  )
}
