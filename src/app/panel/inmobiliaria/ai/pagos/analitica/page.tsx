'use client'

/**
 * /ai/pagos/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/pagos/analitica (404 → graceful panel).
 */

import { CurrencyDollar } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { useI18n } from '@/lib/i18n'

function PagosAnalitica() {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/pagos"
          icon={CurrencyDollar}
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.pagos'), href: '/panel/inmobiliaria/ai/pagos' },
            { label: t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle') },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle')}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.pagos.analiticaDesc')}
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function PagosAnaliticaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosAnalitica />
    </PageGuard>
  )
}
