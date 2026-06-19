'use client'

/**
 * /ai/avaluos/cola — the Avalúos human queue (read-only tracking).
 *
 * The unified WorkItem endpoint (?agente=avaluos) feeds the transversal
 * <ColaHumana>; each card opens the detail at ./[id]. Items carry
 * `actions: []` by design — la firma del certificado la hacen
 * Portofino/Leasefy en el backoffice admin; aquí la inmobiliaria solo
 * consulta el estado del pipeline.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaretLeft, Scales } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'

function AvaluosCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('avaluos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/panel/inmobiliaria/ai/avaluos"
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <Scales className="w-3.5 h-3.5" aria-hidden="true" />
            {t('inmobiliaria.ai.workspace.pages.avaluos.eyebrow')}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.comun.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.avaluos.colaDesc')}
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

      {/* Cola humana (transversal component) — opens the detail */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/avaluos/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.avaluos.colaEmptyHint')}
      />
    </div>
  )
}

export default function AvaluosColaPage() {
  return (
    <PageGuard module="avaluos">
      <AvaluosCola />
    </PageGuard>
  )
}
