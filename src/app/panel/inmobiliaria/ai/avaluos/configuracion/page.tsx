'use client'

/**
 * /ai/avaluos/configuracion — the Avalúos autonomy posture.
 *
 * Read-only day-1: GET /ai-hub/agentes/avaluos/autonomia feeds the
 * transversal <AutonomiaPanel> (mode pills + valla). Avalúos is read-only
 * tracking end to end — la firma del certificado la gestiona el avaluador
 * (Portofino/Leasefy) en el backoffice admin.
 */

import Link from 'next/link'
import { CaretLeft, Scales } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { useI18n } from '@/lib/i18n'

function AvaluosConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('avaluos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/avaluos"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <Scales className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.workspace.pages.avaluos.eyebrow')}
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
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
