'use client'

/**
 * /ai/conciliacion/cola — F6: the Conciliación human queue.
 *
 * Moved here from the F1 /ai/conciliacion page (which is now the Sala): the
 * unified WorkItem endpoint (?agente=conciliacion) feeds the transversal
 * <ColaHumana>; each card opens the new case detail at ./[id].
 */

import { useRouter } from 'next/navigation'
import { Bank } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { useI18n } from '@/lib/i18n'

function ConciliacionCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <MigaDePan
            backHref="/panel/inmobiliaria/ai/conciliacion"
            icon={Bank}
            crumbs={[
              { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
              { label: t('inmobiliaria.ai.workspace.agente.conciliacion'), href: '/panel/inmobiliaria/ai/conciliacion' },
              { label: t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle') },
            ]}
          />
          <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.conciliacion.colaDesc')}
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
        agente="conciliacion"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/conciliacion/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.conciliacion.colaEmptyHint')}
        emptyAction={{
          label: t('inmobiliaria.ai.workspace.pages.conciliacion.accionTitle'),
          href: '/panel/inmobiliaria/ai/conciliacion/movimientos',
        }}
      />
    </div>
  )
}

export default function ConciliacionColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionCola />
    </PageGuard>
  )
}
