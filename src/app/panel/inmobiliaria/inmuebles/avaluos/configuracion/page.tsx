'use client'

/**
 * /ai/avaluos/configuracion — the Avalúos autonomy posture.
 *
 * GET /ai-hub/agentes/avaluos/autonomia feeds the transversal <AutonomiaPanel>.
 * El modo gobierna la pregunta del canon al propietario, cambiar el canon y
 * pedir el avalúo (PrecioDelPilotoService del back): un administrador lo
 * cambia aquí. La firma del certificado la gestiona el avaluador
 * (Portofino/Leasefy) en el backoffice admin.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'

function AvaluosConfiguracion() {
  const { t } = useI18n()
  // QA 19-10: le decía a la administradora «Solo un administrador puede
  // cambiar el modo». El modo de Avalúos SÍ gobierna (la pregunta del canon,
  // cambiar el canon, pedir el avalúo): quien es administrador lo cambia aquí,
  // como en Matching y Asegurabilidad.
  const { isAdmin } = usePermissionsContext()
  const { data, isLoading, error, busy, setModo, refetch } = useAgentAutonomia('avaluos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel
        data={data}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onCambiarModo={setModo}
        puedeCambiar={isAdmin}
        busy={busy}
      />
    </div>
  )
}

export default function AvaluosConfiguracionPage() {
  return (
    <PageGuard module="avaluos">
      <AvaluosConfiguracion />
    </PageGuard>
  )
}
