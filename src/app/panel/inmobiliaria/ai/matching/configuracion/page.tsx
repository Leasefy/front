'use client'

/**
 * /ai/matching/configuracion — F8: the Matching autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/matching/autonomia feeds the
 * transversal <AutonomiaPanel> (mode pills + valla; matching does not decide
 * about persons → no T-323 callout expected from the backend).
 */

import { GitMerge } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { useI18n } from '@/lib/i18n'

function MatchingConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/matching"
          icon={GitMerge}
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.matching'), href: '/panel/inmobiliaria/ai/matching' },
            { label: t('inmobiliaria.ai.workspace.pages.comun.configTitle') },
          ]}
        />
        <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
    </div>
  )
}

export default function MatchingConfiguracionPage() {
  return (
    <PageGuard module="matching">
      <MatchingConfiguracion />
    </PageGuard>
  )
}
