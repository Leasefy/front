'use client'

/**
 * /ai/conciliacion/cola — F6: the Conciliación human queue.
 *
 * Moved here from the F1 /ai/conciliacion page (which is now the Sala): the
 * unified WorkItem endpoint (?agente=conciliacion) feeds the transversal
 * <ColaHumana>; each card opens the new case detail at ./[id].
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bank, CaretLeft } from '@phosphor-icons/react'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

export default function ConciliacionColaPage() {
  const router = useRouter()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/panel/inmobiliaria/ai/conciliacion"
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <Bank className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Conciliación
          </Link>
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

      {/* Cola humana (transversal component) — opens the case detail */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/conciliacion/${encodeURIComponent(item.id)}`)}
        emptyHint="Sube un extracto en /conciliacion o espera a que el agente proponga cruces."
      />
    </div>
  )
}
