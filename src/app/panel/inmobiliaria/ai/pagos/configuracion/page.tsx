'use client'

/**
 * /ai/pagos/configuracion — F9: the Pagos (AP) autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/pagos/autonomia feeds the transversal
 * <AutonomiaPanel> (mode pills + valla; pagos decides over money, not
 * persons — the T-323 callout renders only if the backend serves t323=true).
 * Backend serves all 6 agents' autonomia since F6.
 */

import Link from 'next/link'
import { CaretLeft, CurrencyDollar } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'

function PagosConfiguracion() {
  const { data, isLoading, error } = useAgentAutonomia('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/pagos"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <CurrencyDollar className="w-3.5 h-3.5" aria-hidden="true" />
          Agente · Pagos (AP)
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Configuración y autonomía</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Modo de operación del agente y la valla que delimita lo que puede hacer. Solo lectura por
          ahora — los cambios de modo llegan con la certificación de la valla.
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
    </div>
  )
}

export default function PagosConfiguracionPage() {
  return (
    <PageGuard>
      <PagosConfiguracion />
    </PageGuard>
  )
}
