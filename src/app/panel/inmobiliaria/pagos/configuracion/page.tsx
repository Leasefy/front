'use client'

/**
 * /ai/pagos/configuracion — F9: the Pagos (AP) autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/pagos/autonomia feeds the transversal
 * <AutonomiaPanel> (mode pills + valla; pagos decides over money, not
 * persons — the T-323 callout renders only if the backend serves t323=true).
 * Backend serves all 6 agents' autonomia since F6.
 */

import Link from 'next/link'
import { PageGuard } from '@/components/auth/PageGuard'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { useI18n } from '@/lib/i18n'

function PagosConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useAgentAutonomia('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* GLOW UP 3.ª vuelta · el encabezado común, como el de Conciliación (antes un h1 suelto). */}
      <div className="space-y-3">
        <Link href="/panel/inmobiliaria/pagos/agente" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
          Agente de pagos
        </Link>
        {/* C2 (revisora r25): la vuelta dice «Agente de pagos»; el sobretítulo es la sección del menú. */}
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.nav.secAgentes')}
          titulo={t('inmobiliaria.ai.workspace.pages.comun.configTitle')}
          descripcion={t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        />
      </div>

      {/* Revisora r25 (#1): el fallo con su «Intentar de nuevo» (antes sin botón). */}
      <AutonomiaPanel data={data} isLoading={isLoading} error={error} onReintentar={refetch} />
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
