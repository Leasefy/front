'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching/cola — Candidatos sugeridos.
 *
 * El endpoint unificado de work-items (?agente=matching) alimenta la
 * <ColaHumana> transversal; cada fila abre el detalle en ./[id].
 *
 * ── El vacío vive DENTRO de la tabla ──────────────────────────────────────
 * Nico (2026-09-08): «acá no veo que estés usando la tabla como tenemos en la
 * plataforma». Esta página pintaba su propio vacío a página completa cuando no
 * había casos, así que sin trabajo no se veía tabla ninguna. Ahora el vacío es
 * el de <ColaHumana> —dentro del cuerpo, con los encabezados de columna a la
 * vista— y lo único que aporta la página son sus palabras: acá el vacío no es
 * «el agente revisó y no encontró nada» sino «Matching todavía no está
 * trabajando tu cartera».
 */

import { useRouter } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { SectionLabel } from '@/components/ui/section-label'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'

function MatchingCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('matching')

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

      <ColaHumana
        agente="matching"
        items={items}
        isLoading={isLoading}
        error={error}
        emptyTitle={t(`${PAGES_NS}.sinTrabajo.title`)}
        emptyHint={t(`${PAGES_NS}.sinTrabajo.desc`)}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) =>
          router.push(`/panel/inmobiliaria/postulaciones/matching/${encodeURIComponent(item.id)}`)
        }
      />
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
