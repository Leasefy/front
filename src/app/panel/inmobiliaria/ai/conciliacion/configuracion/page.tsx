'use client'

/**
 * /ai/conciliacion/configuracion — F6: the Conciliación autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/conciliacion/autonomia feeds the
 * transversal <AutonomiaPanel> (mode pills + valla + T-323 callout).
 */

import Link from 'next/link'
import { Bank, CaretLeft } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'

function ConciliacionConfiguracion() {
  const { data, isLoading, error } = useAgentAutonomia('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/conciliacion"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <Bank className="w-3.5 h-3.5" aria-hidden="true" />
          Agente · Conciliación
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

export default function ConciliacionConfiguracionPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionConfiguracion />
    </PageGuard>
  )
}
