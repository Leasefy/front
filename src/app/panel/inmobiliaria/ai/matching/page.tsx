'use client'

/**
 * /ai/matching — F8: the Matching Sala (complete workspace).
 *
 * Restructured from the F3 page (which was the cola): this page is now the
 * generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion — mirroring the F6 Conciliación workspace 1:1.
 *
 * Note: smart-matching runs carry no agencyId, so the cola is scoped by
 * agency membership — matches triggered by the backend service won't appear
 * until the pipeline persists agencyId (a backend follow-up).
 */

import { GitMerge } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

function MatchingSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('matching')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="matching"
      titulo={t('inmobiliaria.ai.workspace.pages.matching.salaTitulo')}
      descripcion={t('inmobiliaria.ai.workspace.pages.matching.salaDesc')}
      icon={GitMerge}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/matching/cola"
      colaCount={colaCount}
    />
  )
}

export default function MatchingSalaPage() {
  return (
    // Agent module gate — ABSENT key in my-permissions = allowed
    // (see agent-module-access.ts); present without 'view' = denied.
    <PageGuard module="matching">
      <MatchingSala />
    </PageGuard>
  )
}
