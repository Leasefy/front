'use client'

/**
 * /ai/conciliacion — F1 of the Agent Workspace initiative.
 *
 * The Conciliación "Sala del agente" rendered through the TRANSVERSAL pattern:
 * the unified WorkItem endpoint (`/ai-hub/work-items?agente=conciliacion`) feeds
 * the generic <ColaHumana>. This is the first agent to adopt the shared pattern
 * end-to-end (AGENT-WORKSPACE-SPEC §2.3, F0 build order F1).
 *
 * The legacy domain-specific page at /conciliacion stays untouched; a redirect
 * to this canonical /ai/conciliacion is a follow-up.
 */

import { Bank } from '@phosphor-icons/react'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

export default function ConciliacionSalaPage() {
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header / Sala */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <Bank className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Conciliación
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Cola humana</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Cruces bancarios que el agente sugiere y necesitan tu revisión. Aprobar concilia el
            movimiento; rechazar lo devuelve a sin identificar. Modo Copiloto: nada se aplica sin ti.
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
        emptyHint="Sube un extracto en /conciliacion o espera a que el agente proponga cruces."
      />
    </div>
  )
}
