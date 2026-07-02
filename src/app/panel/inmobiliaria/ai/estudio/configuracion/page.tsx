'use client'

/**
 * /ai/estudio/configuracion — F7: the Estudio del inquilino autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/estudio/autonomia feeds the
 * transversal <AutonomiaPanel> (mode pills + valla + T-323 callout — estudio
 * decides about persons, so the backend serves t323=true and the amber
 * callout renders).
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { useI18n } from '@/lib/i18n'

function EstudioConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
    </div>
  )
}

export default function EstudioConfiguracionPage() {
  return (
    <PageGuard module="estudio">
      <EstudioConfiguracion />
    </PageGuard>
  )
}
