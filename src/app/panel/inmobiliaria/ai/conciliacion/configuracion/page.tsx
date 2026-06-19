'use client'

/**
 * /ai/conciliacion/configuracion — F6: the Conciliación autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/conciliacion/autonomia feeds the
 * transversal <AutonomiaPanel> (mode pills + valla + T-323 callout).
 */

import { Bank } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { useI18n } from '@/lib/i18n'

function ConciliacionConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/conciliacion"
          icon={Bank}
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.conciliacion'), href: '/panel/inmobiliaria/ai/conciliacion' },
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

export default function ConciliacionConfiguracionPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionConfiguracion />
    </PageGuard>
  )
}
