'use client'

/**
 * /ai/cotizador/cola — F5 of the Agent Workspace initiative.
 *
 * Read-only TRIAGE cola of borderline asegurabilidad verdicts ("con
 * condiciones"), via the unified WorkItem endpoint (?agente=cotizador). Each
 * card deep-links (onOpen) into the EXISTING rich /ai/cotizador/[quoteId]
 * workflow, where the operator chooses a carrier, adjusts, or re-quotes — F5
 * never duplicates that decision surface. Owned by the comercial role.
 */

import { useRouter } from 'next/navigation'
import { ShieldCheck } from '@phosphor-icons/react'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

export default function CotizadorColaPage() {
  const router = useRouter()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('cotizador')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header / Sala */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Cotizador / Asegurabilidad
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Verdicts por revisar</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Cotizaciones cuyo veredicto de asegurabilidad quedó <strong>con condiciones</strong> (sin
            una aprobación limpia). Abre cada una para elegir aseguradora, ajustar las condiciones o
            re-cotizar. Triage de los últimos 30 días.
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            Por revisar
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) — read-only triage, deep-links to detail */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/cotizador/${item.id}`)}
        emptyHint="No hay verdicts con condiciones por revisar."
      />
    </div>
  )
}
