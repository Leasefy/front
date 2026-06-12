'use client'

/**
 * /ai/estudio/cola — F7: the Estudio del inquilino human queue.
 *
 * Moved here from the F2 /ai/estudio page (which is now the Sala): the
 * unified WorkItem endpoint (?agente=estudio) feeds the transversal
 * <ColaHumana>; each card opens the new case detail at ./[id]. Approving or
 * rejecting an applicant is a decision affecting a person (Sentencia
 * T-323/2024) → surfaced via the WorkItem `t323` flag, and every decision is
 * recorded audit-first on the backend.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaretLeft, ShieldCheck } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'

function EstudioCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/panel/inmobiliaria/ai/estudio"
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {t('inmobiliaria.ai.workspace.pages.estudio.eyebrow')}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.estudio.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.estudio.colaDesc')}
          </p>
          {/* Leyenda de niveles — los items muestran "Nivel A/B/C/D" sin explicación */}
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Niveles:</span>{' '}
            A = mejor perfil · B = buen perfil · C = perfil ajustado · D = mayor riesgo
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            {t('inmobiliaria.ai.workspace.pages.comun.enCola')}
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) — opens the case detail */}
      <ColaHumana
        agente="estudio"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/estudio/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.estudio.colaEmptyHint')}
      />
    </div>
  )
}

export default function EstudioColaPage() {
  return (
    <PageGuard module="estudio">
      <EstudioCola />
    </PageGuard>
  )
}
