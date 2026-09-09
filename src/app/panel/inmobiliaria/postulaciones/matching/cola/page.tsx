'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching/cola — Candidatos sugeridos.
 *
 * El endpoint unificado de work-items (?agente=matching) alimenta la
 * <ColaHumana> transversal; cada tarjeta abre el detalle en ./[id].
 *
 * ── El vacío dice la verdad ───────────────────────────────────────────────
 * Hoy el micro no corre Matching para ninguna inmobiliaria (las corridas no
 * guardan agencyId), así que esta cola vuelve vacía por diseño. El vacío de
 * <ColaHumana> es un «Cola vacía» con un check, que se lee como «el agente
 * revisó y no encontró nada». Por eso, sin casos, esta página pinta su propio
 * vacío —el canónico— y dice que Matching todavía no está trabajando tu
 * cartera. Cargando, fallo y lista con casos siguen siendo de <ColaHumana>.
 */

import { useRouter } from 'next/navigation'
import { GitMerge } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionLabel } from '@/components/ui/section-label'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'

function MatchingCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('matching')

  const sinCasos = !isLoading && !error && items.length === 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <SectionLabel>{t(`${PAGES_NS}.salaTitulo`)}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(`${PAGES_NS}.colaTitle`)}</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t(`${PAGES_NS}.colaDesc`)}</p>
        </div>

        {/* El contador sólo cuando hay algo que contar: un «0 pendientes»
            sobre una cola que nadie alimenta insinúa una revisión que no hubo. */}
        {!isLoading && total > 0 && (
          <div className="shrink-0 rounded-lg border border-border bg-surface px-4 py-3 text-center">
            <p className="text-2xl font-semibold tabular-nums text-fg">{total}</p>
            <p className="text-xs text-fg-muted">{t('inmobiliaria.ai.workspace.pages.comun.enCola')}</p>
          </div>
        )}
      </header>

      {sinCasos ? (
        <EmptyState
          icon={GitMerge}
          title={t(`${PAGES_NS}.sinTrabajo.title`)}
          description={t(`${PAGES_NS}.sinTrabajo.desc`)}
        />
      ) : (
        <ColaHumana
          agente="matching"
          items={items}
          isLoading={isLoading}
          error={error}
          onAction={(item, action, body) => runAction(item, action, body)}
          onOpen={(item) =>
            router.push(`/panel/inmobiliaria/postulaciones/matching/${encodeURIComponent(item.id)}`)
          }
        />
      )}
    </div>
  )
}

export default function MatchingColaPage() {
  return (
    <PageGuard module="matching">
      <MatchingCola />
    </PageGuard>
  )
}
