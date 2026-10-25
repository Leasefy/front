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
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'

function MatchingCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Glow up 22-10: el encabezado común; lo pendiente junto al título, sólo cuando hay algo que contar
          (un «0 pendientes» sobre una cola que nadie alimenta insinúa una revisión que no hubo). */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t(`${PAGES_NS}.colaTitle`)}
        descripcion={t(`${PAGES_NS}.colaDesc`)}
        junto={
          !isLoading && total > 0 ? (
            <span className="text-caption text-fg-muted">
              <span className="font-mono tabular-nums text-fg">{total}</span>{' '}
              {t('inmobiliaria.ai.workspace.pages.comun.enCola').toLowerCase()}
            </span>
          ) : null
        }
      />

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
