'use client'

/**
 * /ai/pagos/cola — F9: the Pagos (AP) human queue.
 *
 * Moved here from the F4 /ai/pagos page (which is now the Sala): the unified
 * WorkItem endpoint (?agente=pagos) feeds <ColaHumana> with vendor bills
 * pending approval. Owned by the contador role. Approve/reject post to the
 * EXISTING AP triple-gate endpoints (tier matrix + SoD enforced server-side);
 * each card also opens the case detail at ./[id].
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaretLeft, CurrencyDollar } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'

function PagosCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/panel/inmobiliaria/ai/pagos"
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <CurrencyDollar className="w-3.5 h-3.5" aria-hidden="true" />
            {t('inmobiliaria.ai.workspace.pages.pagos.eyebrow')}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.pagos.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.pagos.colaDesc')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            {t('inmobiliaria.ai.workspace.pages.pagos.porAprobar')}
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) — opens the case detail.
          agente habilita el override de estados por agente (estadoLabel). */}
      <ColaHumana
        agente="pagos"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/pagos/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.pagos.colaEmptyHint')}
      />
    </div>
  )
}

export default function PagosColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCola />
    </PageGuard>
  )
}
