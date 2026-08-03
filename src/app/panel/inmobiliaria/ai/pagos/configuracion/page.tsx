'use client'

/**
 * /ai/pagos/configuracion — F9: the Pagos (AP) autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/pagos/autonomia feeds the transversal
 * <AutonomiaPanel> (mode pills + valla; pagos decides over money, not
 * persons — the T-323 callout renders only if the backend serves t323=true).
 * Backend serves all 6 agents' autonomia since F6.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { useI18n } from '@/lib/i18n'

function PagosConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
    </div>
  )
}

export default function PagosConfiguracionPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosConfiguracion />
    </PageGuard>
  )
}
