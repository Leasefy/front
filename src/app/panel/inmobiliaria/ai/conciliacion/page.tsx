'use client'

/**
 * /ai/conciliacion — F6: the Conciliación Sala (first COMPLETE workspace).
 *
 * Restructured from the F1 page (which mixed Sala + Cola): this page is now
 * the generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion (AGENT-WORKSPACE-SPEC §1.4).
 *
 * F10 (SPEC §4): the movimientos + extractos surface now lives INSIDE the
 * workspace at ./movimientos (the legacy /conciliacion URL redirects here)
 * and is linked from the domain slot below.
 */

import Link from 'next/link'
import { ArrowSquareOut, Bank } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

function ConciliacionSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('conciliacion')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="conciliacion"
      titulo={t('inmobiliaria.ai.workspace.pages.conciliacion.salaTitulo')}
      descripcion={t('inmobiliaria.ai.workspace.pages.conciliacion.salaDesc')}
      icon={Bank}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/conciliacion/cola"
      colaCount={colaCount}
    >
      {/* Domain slot: the movimientos/extractos surface (now ./movimientos) */}
      <Link
        href="/panel/inmobiliaria/ai/conciliacion/movimientos"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
        {t('inmobiliaria.ai.workspace.pages.conciliacion.verMovimientos')}
      </Link>
    </SalaAgente>
  )
}

export default function ConciliacionSalaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionSala />
    </PageGuard>
  )
}
