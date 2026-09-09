'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching/configuracion — postura de
 * autonomía de Matching.
 *
 * GET /ai-hub/agentes/matching/autonomia alimenta el <AutonomiaPanel>
 * transversal (píldoras de modo + valla; Matching no decide sobre personas,
 * así que no se espera el aviso T-323). El panel es de sólo lectura aunque
 * el micro ya expone PUT …/autonomia: guardar el modo es un cambio del panel
 * compartido, no de esta página.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { SectionLabel } from '@/components/ui/section-label'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'
const COMUN_NS = 'inmobiliaria.ai.workspace.pages.comun'

function MatchingConfiguracion() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const { data, isLoading, error, busy, setModo, refetch } = useAgentAutonomia('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-1.5">
        <SectionLabel>{t(`${PAGES_NS}.salaTitulo`)}</SectionLabel>
        <h1 className="text-h2 text-fg">{t(`${COMUN_NS}.configTitle`)}</h1>
        <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t(`${COMUN_NS}.configDesc`)}</p>
      </header>

      {/* El modo se guarda de verdad (PUT …/autonomia), como en Asegurabilidad; un no-admin lo ve como chip. */}
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

export default function MatchingConfiguracionPage() {
  return (
    <PageGuard module="matching">
      <MatchingConfiguracion />
    </PageGuard>
  )
}
