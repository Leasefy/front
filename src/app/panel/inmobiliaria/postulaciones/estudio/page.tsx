'use client'

/**
 * /ai/estudio — Tier-B "Estudios de inquilinos" overview (visión §3 / §19).
 *
 * Reemplaza el <SalaAgente> genérico por una Sala a medida (espejo de cobranza):
 * resumen ejecutivo + KPIs + pipeline por estado + actividad reciente + "cómo
 * funciona". Se alimenta del overview funcional ya cableado (useEstudioOverview
 * → AgentOverviewResponse). UX-only.
 *
 * 🔴 Sin bandeja prometida (PROMESAS-Y-DIRECTOR, 05-10-2026): la tarjeta «Qué
 * necesita tu atención → Abrir bandeja» y el botón «Ver estudios» llevaban a
 * `/estudio/estudios`, que lee la cola del micro para `agente=estudio`, y esa
 * cola vuelve SIEMPRE vacía (micro `agency-ai-hub-work-items.ts`, `case
 * 'estudio'` → `emptyResponse`; el resumen, `emptyOverview`): el estudio guarda
 * en tablas sin inmobiliaria por la que filtrar. Los dos se fueron. Con el
 * resumen vacío la sala dice dónde se ve cada estudio (la ficha del candidato,
 * en su postulación) en vez de «aparecerán aquí». Prueba:
 * `no-promete-la-bandeja.test.tsx`.
 */

import {
  ChartBar,
  CheckCircle,
  ClipboardText,
  FileMagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import { useEstudioOverview } from '@/lib/hooks/estudio/use-estudio-overview'
import { EstudioKpiStrip } from '@/components/inmobiliaria/estudio/EstudioKpiStrip'
import { EstudioOverviewSkeleton } from '@/components/skeleton/panel/EstudioOverviewSkeleton'
import { relativeTime } from '@/lib/cartera'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AnimatedNumber, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.estudio'
const NS = 'inmobiliaria.ai.estudio'

/**
 * «¿Cómo funciona?» — los 4 pasos del estudio, detrás del botón del encabezado
 * (Nico, 05-10-2026: «eso no debe de estar ahí siempre […] llévalas al botón
 * que al dar clic abre drawer y explica mejor cada cosa»). Antes eran cuatro
 * tarjetas siempre a la vista.
 *
 * Verificado contra el código (05-10): el estudio es OPCIONAL y lo pide el
 * candidato desde su portal (el panel ya no lo lanza); la afianzadora consulta
 * centrales de riesgo y listas restrictivas con su autorización; el resultado
 * se ve en la ficha del candidato y la decisión es siempre de una persona. Los
 * textos de antes («cada postulación entra sola», «los dudosos llegan aquí»)
 * prometían lo que el código no hace.
 */
const COMO_FUNCIONA_STEPS: { icon: Icon; clave: string; quien: QuienLoHace; tuParte?: true }[] = [
  { icon: ClipboardText, clave: 'step1', quien: 'candidato' },
  { icon: FileMagnifyingGlass, clave: 'step2', quien: 'agente' },
  { icon: ChartBar, clave: 'step3', quien: 'tu', tuParte: true },
  { icon: CheckCircle, clave: 'step4', quien: 'leasefy' },
]

function EstudioOverview() {
  const { t, locale } = useI18n()
  const { data, isLoading, error, errorCrudo, refetch } = useEstudioOverview()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // contenido); lo que ya estaba al montarse no se anima.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
        <EstudioOverviewSkeleton />
      </CrossFade>
    )
  }

  // El micro responde para el estudio un resumen VÁLIDO pero vacío
  // (`emptyOverview`): sin esto la sala quedaba en blanco debajo del encabezado.
  const hayResumen = Boolean(
    data && (data.kpis.length > 0 || data.pipeline.length > 0 || data.feed.length > 0),
  )

  return (
    <CrossFade swapKey="estudio">
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header — resumen ejecutivo */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-h2 text-fg">
            {tf(`${NS}.overview.title`, 'Estudios de inquilinos')}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5 max-w-2xl line-clamp-2">
            {tf(
              `${NS}.overview.subtitle`,
              'El estudio es opcional y lo pide el candidato desde su portal. Su resultado aparece en la ficha del candidato, dentro de su postulación, y ahí decides tú.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-fg-muted whitespace-nowrap">
              {tf(`${NS}.overview.lastUpdated`, 'Actualizado hace')} {relativeTime(data.generatedAt, locale)}
            </p>
          )}
          {/* ¿Cómo funciona? — el cajón con los cuatro pasos (05-10-2026). */}
          <ParaEntenderMas
            etiqueta={t(`${PAGES_NS}.comoFunciona.title`)}
            titulo={t(`${PAGES_NS}.comoFunciona.titulo`)}
            descripcion={t(`${PAGES_NS}.comoFunciona.descripcion`)}
            variante="secundario"
          >
            <PasosExplicados
              data-testid="estudio-como-funciona"
              pasos={COMO_FUNCIONA_STEPS.map((step) => ({
                id: step.clave,
                icono: step.icon,
                titulo: t(`${PAGES_NS}.comoFunciona.${step.clave}.title`),
                explicacion: t(`${PAGES_NS}.comoFunciona.${step.clave}.desc`),
                quien: step.quien,
                tuParte: step.tuParte ? t(`${PAGES_NS}.comoFunciona.${step.clave}.tuParte`) : undefined,
              }))}
            />
          </ParaEntenderMas>
        </div>
      </header>

      {/* Vacío: sin overview, o con el overview vacío que el micro devuelve
          HOY para el estudio (sin KPIs, sin pipeline, sin actividad). No dice
          «aparecerán aquí» (nunca van a aparecer): dice dónde se ve cada
          estudio y lleva a Postulaciones. */}
      {/* Sin datos ⇄ el resumen: el uno sale y el otro entra. */}
      <CrossFade swapKey={hayResumen ? 'resumen' : !isLoading && !error ? 'vacio' : 'nada'} className="space-y-6">
      {!hayResumen && !isLoading && !error && (
        <EmptyState
          icon={ShieldCheck}
          title={tf(`${NS}.overview.empty.title`, 'Cada estudio se ve en su postulación')}
          description={tf(
            `${NS}.overview.empty.description`,
            'Esta sala no junta los estudios: el resultado de cada uno aparece en la ficha del candidato, dentro de su postulación.',
          )}
          primaryCta={{
            label: tf(`${NS}.overview.empty.cta`, 'Ir a Postulaciones'),
            href: '/panel/inmobiliaria/postulaciones',
          }}
        />
      )}

      {data && hayResumen && (
        <>
          {/* KPIs (visión §3 / §19) */}
          <EstudioKpiStrip kpis={data.kpis} isLoading={isLoading} />

          {/* Pipeline por estado */}
          {data.pipeline.length > 0 && (
            <section aria-label={tf(`${NS}.overview.pipeline.title`, 'Pipeline por estado')}>
              <h2 className="text-base font-semibold text-fg mb-3">
                {tf(`${NS}.overview.pipeline.title`, 'Pipeline por estado')}
              </h2>
              <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.pipeline.map((seg) => (
                  <StaggerItem
                    key={seg.estado}
                    className="rounded-lg border border-border bg-card p-4"
                    data-estado={seg.estado}
                  >
                    <p className="text-xs font-medium text-fg-muted truncate">
                      {tf(`inmobiliaria.ai.workspace.estado.${seg.estado}`, seg.estado)}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-fg tabular-nums">
                      <AnimatedNumber value={seg.count} format={(n) => String(Math.round(n))} />
                    </p>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          {/* Actividad reciente */}
          {data.feed.length > 0 && (
            <section aria-label={tf(`${NS}.overview.feed.title`, 'Actividad reciente')}>
              <h2 className="text-base font-semibold text-fg mb-3">
                {tf(`${NS}.overview.feed.title`, 'Actividad reciente')}
              </h2>
              <Stagger
                as="ul"
                direction="down"
                role="list"
                className="rounded-lg border border-border bg-card divide-y divide-border"
              >
                {data.feed.slice(0, 8).map((f) => (
                  <StaggerItem as="li" key={f.id} className="px-4 py-3 flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                        f.actorType === 'agent'
                          ? 'bg-primary'
                          : f.actorType === 'user'
                            ? 'bg-success-500'
                            : 'bg-fg-subtle',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{f.titulo}</p>
                      <p className="text-xs text-fg-muted">{f.detalle}</p>
                    </div>
                    <span className="text-xs text-fg-muted whitespace-nowrap shrink-0">
                      {relativeTime(f.occurredAt, locale)}
                    </span>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </>
      )}
      </CrossFade>

      {/* Error (no bloqueante) */}
      {/* El status crudo —«Error al cargar los estudios: 401»— no le dice nada
          a nadie y no ofrece salida. `FalloDeCarga` clasifica el fallo, escribe
          en español lo que pasó y sólo ofrece reintentar cuando reintentar
          puede dar otro resultado. */}
      <Presence show={Boolean(error && !isLoading)}>
        <FalloDeCarga
          error={errorCrudo ?? error}
          queEs="los estudios"
          onReintentar={refetch}
        />
      </Presence>
    </div>
    </CrossFade>
  )
}

export default function EstudioOverviewPage() {
  return (
    <PageGuard module="estudio">
      <EstudioOverview />
    </PageGuard>
  )
}
