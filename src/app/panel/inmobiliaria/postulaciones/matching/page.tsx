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
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'
import { relativeTime } from '@/lib/cartera'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useI18n } from '@/lib/i18n'
import { AnimatedNumber, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'
const SALA_NS = 'inmobiliaria.ai.workspace.sala'
const COLA_HREF = '/panel/inmobiliaria/postulaciones/matching/cola'

/**
 * Los tres pasos que existen hoy. Sin cuarto paso: no hay contacto que aprobar.
 *
 * Viven detrás del botón «¿Cómo funciona?» del encabezado, en el cajón de
 * `ParaEntenderMas` (Nico, 05-10-2026: «eso no debe de estar ahí siempre […]
 * llévalas al botón que al dar clic abre drawer y explica mejor cada cosa»).
 * Antes la tarjeta se veía siempre, también cargando o con error.
 *
 * Verificado contra el código (05-10): compara con los inmuebles disponibles en
 * arriendo y deja los que calzan 70 % o más; en Autónomo sale solo si hay al
 * menos dos opciones; nunca más de un correo cada 24 horas por candidato.
 */
const PASOS: { icon: Icon; clave: string; quien?: QuienLoHace; tuParte?: true }[] = [
  { icon: UserCheck, clave: 'step1' },
  { icon: Buildings, clave: 'step2', quien: 'agente' },
  { icon: Ranking, clave: 'step3', quien: 'tu', tuParte: true },
]

function ComoFunciona() {
  const { t } = useI18n()
  return (
    <ParaEntenderMas
      etiqueta={t(`${PAGES_NS}.comoFunciona.title`)}
      titulo={t(`${PAGES_NS}.comoFunciona.titulo`)}
      descripcion={t(`${PAGES_NS}.comoFunciona.descripcion`)}
      variante="secundario"
    >
      <PasosExplicados
        data-testid="matching-como-funciona"
        pasos={PASOS.map((paso) => ({
          id: paso.clave,
          icono: paso.icon,
          titulo: t(`${PAGES_NS}.comoFunciona.${paso.clave}.title`),
          explicacion: t(`${PAGES_NS}.comoFunciona.${paso.clave}.desc`),
          quien: paso.quien,
          tuParte: paso.tuParte ? t(`${PAGES_NS}.comoFunciona.${paso.clave}.tuParte`) : undefined,
        }))}
      />
    </ParaEntenderMas>
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
      {/* Las tarjetas entran escalonadas y cada cifra cuenta desde 0. */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="matching-kpis">
        {data.kpis.map((kpi) => (
          <StaggerItem key={kpi.id} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs leading-tight text-fg-muted">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              <AnimatedNumber
                value={kpi.value}
                from={0}
                format={(n) => formatKpiValue(n, kpi.format)}
              />
            </p>
          </StaggerItem>
        ))}
      </Stagger>

      {segmentos.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg">{t(`${SALA_NS}.pipelineTitle`)}</h2>
          <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
            {segmentos.map((seg) => (
              <div key={seg.estado} className="flex items-center gap-1.5">
                <dt className="text-xs text-fg-muted">{t(`${PAGES_NS}.estado.${seg.estado}`)}</dt>
                <dd className="text-xs font-medium tabular-nums text-fg">
                  <AnimatedNumber value={seg.count} format={(n) => String(Math.round(n))} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {data.feed.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg">{t(`${SALA_NS}.feedTitle`)}</h2>
          <Stagger as="ul" direction="down" className="divide-y divide-border">
            {data.feed.map((entrada) => (
              <StaggerItem as="li" key={entrada.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{entrada.titulo}</p>
                  <p className="truncate text-xs text-fg-muted">{entrada.detalle}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                  {relativeTime(entrada.occurredAt, locale)}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
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
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {/* ¿Cómo funciona? — el cajón con los tres pasos (05-10-2026). */}
          <ComoFunciona />
          {/* El conteo sólo cuando el micro lo reporta: un «(0)» inventado
              diría que ya revisó y no encontró nada. */}
          <Button asChild hideArrow className="shrink-0">
            <Link href={COLA_HREF}>
              {t(`${PAGES_NS}.colaLabel`)}
              {typeof enCola === 'number' ? ` (${enCola})` : ''}
            </Link>
          </Button>
        </div>
      </header>

      {/* Cargando → fallo / resumen / «aún no trabaja»: cada estado entra con
          su fundido. */}
      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : tieneDatos && data ? 'resumen' : 'sin-trabajo'}>
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
      </CrossFade>
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
