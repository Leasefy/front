'use client'

/**
 * /ai/conciliacion/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/conciliacion/analitica (404 → graceful panel).
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { useConciliacionSummary } from '@/lib/hooks/conciliacion/use-conciliacion-summary'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'
import { ConciliacionResumen } from '@/components/inmobiliaria/ai/ConciliacionResumen'
import { useI18n } from '@/lib/i18n'

function ConciliacionAnalitica() {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('conciliacion')
  // Resumen real del backend (taxonomía + totales + tasa). Fail-soft: null → no se muestra.
  const { data: summary } = useConciliacionSummary()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
          {t('inmobiliaria.ai.workspace.pages.conciliacion.analiticaDesc')}
        </p>
      </header>

      {/* Resumen real del backend: taxonomía + totales + tasa (fail-soft: null → nada) */}
      <ConciliacionResumen data={summary} />

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
