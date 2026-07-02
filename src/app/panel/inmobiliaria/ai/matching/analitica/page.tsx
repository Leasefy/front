'use client'

/**
 * /ai/matching/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/matching/analitica (404 → graceful panel).
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'
import { useI18n } from '@/lib/i18n'

function MatchingAnalitica() {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.matching.analiticaDesc')}
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function MatchingAnaliticaPage() {
  return (
    <PageGuard module="matching">
      <MatchingAnalitica />
    </PageGuard>
  )
}
