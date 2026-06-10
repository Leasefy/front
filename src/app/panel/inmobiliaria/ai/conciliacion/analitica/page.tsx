'use client'

/**
 * /ai/conciliacion/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/conciliacion/analitica (404 → graceful panel).
 */

import Link from 'next/link'
import { Bank, CaretLeft } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'

function ConciliacionAnalitica() {
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/conciliacion"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <Bank className="w-3.5 h-3.5" aria-hidden="true" />
          Agente · Conciliación
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Analítica</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Desempeño del agente de conciliación en los últimos 30 días: casos cruzados, tasa de
          aciertos y monto conciliado por día.
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function ConciliacionAnaliticaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionAnalitica />
    </PageGuard>
  )
}
