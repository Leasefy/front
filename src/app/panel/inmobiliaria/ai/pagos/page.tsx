'use client'

/**
 * /ai/pagos — F4 of the Agent Workspace initiative.
 *
 * The "Pagos" (AP) Sala, rendered through the TRANSVERSAL pattern: the unified
 * WorkItem endpoint (`/ai-hub/work-items?agente=pagos`) feeds <ColaHumana> with
 * vendor bills pending approval. Owned by the contador role. Approve/reject post
 * to the EXISTING AP triple-gate endpoints (tier matrix + SoD enforced server-
 * side). Replaces the Phase-40 landing placeholder with the operative view it
 * promised ("la vista operativa se conecta a continuación").
 */

import { CurrencyDollar } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

function PagosSala() {
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header / Sala */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <CurrencyDollar className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Pagos
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Cola de aprobación</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Facturas de proveedor pendientes de aprobar. Revisa el monto, el proveedor y el
            vencimiento, luego aprueba o rechaza. La matriz por monto/centro de costo y la separación
            de funciones se validan en el servidor. Modo Copiloto: ninguna dispersión sale sin ti.
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            Por aprobar
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        emptyHint="No hay facturas pendientes de aprobación."
      />
    </div>
  )
}

export default function PagosPage() {
  return (
    <PageGuard>
      <PagosSala />
    </PageGuard>
  )
}
