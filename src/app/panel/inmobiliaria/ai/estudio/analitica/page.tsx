'use client'

/**
 * /ai/estudio/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/estudio/analitica (404 → graceful panel).
 */

import { ShieldCheck } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { useI18n } from '@/lib/i18n'

function EstudioAnalitica() {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/estudio"
          icon={ShieldCheck}
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.estudio'), href: '/panel/inmobiliaria/ai/estudio' },
            { label: t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle') },
          ]}
        />
        <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.estudio.analiticaDesc')}
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function EstudioAnaliticaPage() {
  return (
    <PageGuard module="estudio">
      <EstudioAnalitica />
    </PageGuard>
  )
}
