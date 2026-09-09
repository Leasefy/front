'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching — Resumen del agente Matching.
 *
 * ── Por qué esta pantalla dejó de usar <SalaAgente> ───────────────────────
 * Hoy el micro no corre Matching para ninguna inmobiliaria: las corridas de
 * smart-matching no guardan agencyId, así que el overview vuelve vacío o 404
 * por diseño. <SalaAgente> pintaba igual «Casos por etapa: sin casos» y
 * «Sin actividad reciente», y eso se lee como «el agente trabaja y no
 * encontró nada», que es falso. Acá el vacío dice la verdad —todavía no está
 * trabajando tu cartera— y los números sólo se pintan cuando el overview
 * trae KPIs, que es cuando el agente esté encendido de verdad.
 *
 * El cableado a useAgentOverview se conserva a propósito: el día que el
 * micro persista agencyId, esta pantalla se enciende sola.
 *
 * «¿Cómo funciona?» describe SÓLO lo que existe: candidato validado → cruce
 * con inmuebles vacantes → revisas y decides. El cuarto paso de antes
 * («apruebas y el agente hace el contacto») prometía un contacto que ninguna
 * acción respalda; se fue.
 */

import Link from 'next/link'
import { Buildings, GitMerge, Ranking, UserCheck } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { formatKpiValue } from '@/components/inmobiliaria/ai/SalaAgente'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionLabel } from '@/components/ui/section-label'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'
import { relativeTime } from '@/lib/cartera'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'
const SALA_NS = 'inmobiliaria.ai.workspace.sala'
const COLA_HREF = '/panel/inmobiliaria/postulaciones/matching/cola'

/** Los tres pasos que existen hoy. Sin cuarto paso: no hay contacto que aprobar. */
const PASOS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: UserCheck, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: Buildings, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: Ranking, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
]

function ComoFunciona() {
  const { t } = useI18n()
  return (
    <section
      className="max-w-3xl space-y-4 rounded-lg border border-border bg-surface p-5"
      data-testid="matching-como-funciona"
    >
      <h2 className="text-base font-semibold text-fg">{t(`${PAGES_NS}.comoFunciona.title`)}</h2>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PASOS.map((paso, i) => {
          const PasoIcono = paso.icon
          return (
            <li key={paso.titleKey} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <PasoIcono className="h-4 w-4 text-fg" weight="duotone" aria-hidden="true" />
                </span>
                <span className="text-xs tabular-nums text-fg-muted">{i + 1}</span>
              </div>
              <p className="text-sm font-semibold leading-tight text-fg">{t(paso.titleKey)}</p>
              <p className="text-xs leading-snug text-fg-muted">{t(paso.descKey)}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * Lo que se pinta cuando el overview trae KPIs de verdad. Sólo las secciones
 * con contenido: un pipeline en cero o un feed vacío no se dibujan, porque
 * «sin casos» al lado de números reales vuelve a insinuar trabajo que no hubo.
 */
function ResumenConDatos({ data }: { data: AgentOverviewResponse }) {
  const { t, locale } = useI18n()
  const segmentos = data.pipeline.filter((seg) => seg.count > 0)

  return (
    <div className="space-y-6" data-testid="matching-resumen-datos">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="matching-kpis">
        {data.kpis.map((kpi) => (
          <div key={kpi.id} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs leading-tight text-fg-muted">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {formatKpiValue(kpi.value, kpi.format)}
            </p>
          </div>
        ))}
      </div>

      {segmentos.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg">{t(`${SALA_NS}.pipelineTitle`)}</h2>
          <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
            {segmentos.map((seg) => (
              <div key={seg.estado} className="flex items-center gap-1.5">
                <dt className="text-xs text-fg-muted">{t(`${PAGES_NS}.estado.${seg.estado}`)}</dt>
                <dd className="text-xs font-medium tabular-nums text-fg">{seg.count}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {data.feed.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg">{t(`${SALA_NS}.feedTitle`)}</h2>
          <ul className="divide-y divide-border">
            {data.feed.map((entrada) => (
              <li key={entrada.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{entrada.titulo}</p>
                  <p className="truncate text-xs text-fg-muted">{entrada.detalle}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                  {relativeTime(entrada.occurredAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function MatchingResumen() {
  const { t } = useI18n()
  const { data, isLoading, error, errorCrudo, refetch } = useAgentOverview('matching')

  // «Encendido» = el micro devolvió KPIs. Un 404 o un overview con todo en
  // cero es el mismo caso: el agente todavía no trabaja esta cartera.
  const tieneDatos = Boolean(data && data.kpis.length > 0)
  const enCola = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <SectionLabel>{t(`${PAGES_NS}.salaTitulo`)}</SectionLabel>
          <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.nav.resumen')}</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t(`${PAGES_NS}.salaDesc`)}</p>
        </div>
        {/* El conteo sólo cuando el micro lo reporta: un «(0)» inventado
            diría que ya revisó y no encontró nada. */}
        <Button asChild hideArrow className="shrink-0">
          <Link href={COLA_HREF}>
            {t(`${PAGES_NS}.colaLabel`)}
            {typeof enCola === 'number' ? ` (${enCola})` : ''}
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="matching-resumen-cargando" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface-muted" />
          ))}
        </div>
      ) : error ? (
        <FalloDeCarga error={errorCrudo} queEs={t(`${PAGES_NS}.queEs`)} onReintentar={refetch} />
      ) : tieneDatos && data ? (
        <ResumenConDatos data={data} />
      ) : (
        // Sin CTA a propósito: no hay nada que el usuario pueda hacer para
        // encenderlo desde acá, y un botón que no hace nada es peor que ninguno.
        <EmptyState
          icon={GitMerge}
          title={t(`${PAGES_NS}.sinTrabajo.title`)}
          description={t(`${PAGES_NS}.sinTrabajo.desc`)}
        />
      )}

      <ComoFunciona />
    </div>
  )
}

export default function MatchingResumenPage() {
  return (
    // Compuerta del módulo — clave AUSENTE en my-permissions = permitido
    // (ver agent-module-access.ts); presente sin 'view' = negado.
    <PageGuard module="matching">
      <MatchingResumen />
    </PageGuard>
  )
}
