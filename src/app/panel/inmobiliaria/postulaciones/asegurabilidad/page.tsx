'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  ClipboardText,
  Lightning,
  Plus,
  ShieldCheck,
  Tray,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import {
  useCotizadorOverview,
  type CotizadorOverviewResponse,
  type QuoteInsertEvent,
} from '@/lib/hooks/cotizador/use-cotizador-overview'
import { CotizadorKpiStrip } from '@/components/inmobiliaria/cotizador/CotizadorKpiStrip'
import { CotizadorRecentQuotesFeed } from '@/components/inmobiliaria/cotizador/CotizadorRecentQuotesFeed'
import { CotizadorCarriersStatus } from '@/components/inmobiliaria/cotizador/CotizadorCarriersStatus'
import { CotizadorOverviewSkeleton } from '@/components/skeleton/panel/CotizadorOverviewSkeleton'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/section-label'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import { relativeTime } from '@/lib/cartera'
import { CrossFade } from '@leasefy/cadence'

// Permissions gate is enforced by the cotizador layout (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.cotizador'

/**
 * «¿Cómo funciona?» — los 4 pasos del viaje de la cotización, detrás del botón
 * del encabezado (Nico, 05-10-2026: «eso no debe de estar ahí siempre […]
 * llévalas al botón que al dar clic abre drawer y explica mejor cada cosa»).
 * Antes era una tira de cuatro tarjetas al pie, en el vacío y con datos.
 *
 * Verificado contra el código (05-10): «Nueva cotización» es un asistente
 * corto; el agente consulta las aseguradoras activas en paralelo; la matriz
 * trae resultado, condición y costo con su porqué. El paso 4 ya NO manda a
 * «Por revisar»: la cola del cotizador hoy siempre vuelve vacía y «elegir
 * aseguradora» está en «Próximamente»; lo que sí funciona en la cotización es
 * pedir la explicación, re-cotizar y descargar el PDF.
 */
const COMO_FUNCIONA_STEPS: { icon: Icon; clave: string; quien: QuienLoHace; tuParte?: true }[] = [
  { icon: ClipboardText, clave: 'step1', quien: 'tu', tuParte: true },
  { icon: Lightning, clave: 'step2', quien: 'agente' },
  { icon: ShieldCheck, clave: 'step3', quien: 'agente' },
  { icon: CheckCircle, clave: 'step4', quien: 'tu', tuParte: true },
]

function ComoFuncionaCotizador() {
  const { t } = useI18n()
  return (
    <ParaEntenderMas
      etiqueta={t(`${PAGES_NS}.comoFunciona.title`)}
      titulo={t(`${PAGES_NS}.comoFunciona.titulo`)}
      descripcion={t(`${PAGES_NS}.comoFunciona.descripcion`)}
      variante="secundario"
    >
      <PasosExplicados
        data-testid="cotizador-como-funciona"
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
  )
}

export default function CotizadorOverviewPage() {
  const { t, locale } = useI18n()
  // t() with raw-key fallback so a missing key never renders the path.
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }

  const {
    data,
    isLoading,
    error,
    isRealtimeConnected,
    realtimeQuotes,
    refetch,
  } = useCotizadorOverview()

  // Merge realtime-prepended quotes with endpoint quotes, dedup by id
  const mergedQuotes = useMemo<CotizadorOverviewResponse['lastQuotes']>(() => {
    const endpointQuotes = data?.lastQuotes ?? []
    // Convert QuoteInsertEvent to lastQuotes shape
    const rtQuotes = realtimeQuotes.map(
      (q: QuoteInsertEvent): CotizadorOverviewResponse['lastQuotes'][0] => ({
        id: q.id,
        cedulaHashPrefix8: q.cedulaHashPrefix8,
        canonCop: q.canonCop,
        ciudad: q.ciudad,
        status: q.status,
        createdAt: q.createdAt,
        approvedCount: q.approvedCount,
        totalCarriers: q.totalCarriers,
      }),
    )
    const merged = [...rtQuotes, ...endpointQuotes]
    const seen = new Set<string>()
    return merged
      .filter((q) => {
        if (seen.has(q.id)) return false
        seen.add(q.id)
        return true
      })
      .slice(0, 10)
  }, [realtimeQuotes, data?.lastQuotes])

  // ── Skeleton guard (Phase 38 plan 38-04b / D-38-04) ───────────────────────
  // Movimiento: esqueleto → sala en un `CrossFade` (el mismo nodo en las dos
  // ramas); adentro, fallo / vacío / resumen se cruzan con su fundido.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
        <CotizadorOverviewSkeleton />
      </CrossFade>
    )
  }

  const sinCotizaciones = !isLoading && !error && mergedQuotes.length === 0

  return (
    <CrossFade swapKey="sala">
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa: etiqueta de sección + título + qué es. Antes el
          vacío salía SIN encabezado: la persona caía en un recuadro suelto sin
          saber en qué pantalla estaba. Ahora las dos ramas comparten el mismo. */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t('inmobiliaria.ai.nav.cotizador')}</SectionLabel>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.nav.cotizadorResumen')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            {/* Positioning copy (visión #1: "radar de asegurabilidad"). Cae al
                subtítulo de beneficio existente si la clave nueva falta. */}
            {tf(
              'inmobiliaria.ai.cotizador.overview.radarSubtitle',
              t(`${PAGES_NS}.salaSubtitle`),
            )}
          </p>
        </div>
        {/* QA-IA-95: a 390 px las tres piezas no caben en un renglón (se corría 118 px): bajan. */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-fg-muted whitespace-nowrap flex items-center gap-2 mr-1">
              {t('inmobiliaria.ai.cotizador.overview.lastUpdated')}{' '}
              {relativeTime(data.generatedAt, locale)}
              {isRealtimeConnected && (
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-success animate-ping"
                  aria-hidden="true"
                />
              )}
            </p>
          )}
          {/* ¿Cómo funciona? — el cajón con los cuatro pasos (05-10-2026). */}
          <ComoFuncionaCotizador />
          {/* «Por revisar» se fue (PROMESAS-Y-DIRECTOR, 05-10-2026): llevaba a la
              cola del cotizador, que el micro devuelve SIEMPRE vacía a propósito
              (`agency-ai-hub-work-items.ts`, `case 'cotizador'`: el motor resuelve
              cada cotización solo, no hay nada que aprobar). Un botón que lleva a
              nada es un botón muerto. Prueba: `sin-cola-que-nadie-llena.test.tsx`. */}
          {/* Nueva cotización — único CTA primario de la vista (COTI-UI-01) */}
          <Button size="sm" hideArrow asChild>
            <Link href="/panel/inmobiliaria/postulaciones/asegurabilidad/nueva">
              <Plus className="h-4 w-4" weight="bold" />
              {t('inmobiliaria.ai.cotizador.overview.newQuoteCta')}
            </Link>
          </Button>
        </div>
      </header>

      {/* El fallo va ACÁ ARRIBA y reemplaza los datos, no debajo de ellos:
          estaba al final de la página, después de los indicadores en cero y
          las listas vacías, fuera de pantalla. La pantalla afirmaba y
          desmentía en el mismo scroll. */}
      <CrossFade swapKey={error && !isLoading ? 'fallo' : sinCotizaciones ? 'vacio' : 'resumen'} className="space-y-6">
      {error && !isLoading ? (
        <FalloDeCarga
          error={error}
          queEs="el resumen de asegurabilidad"
          onReintentar={refetch}
        />
      ) : sinCotizaciones ? (
        <>
          {/* Dentro de un recuadro: sin él el mensaje quedaba flotando en el
              medio de la página y no se leía como una sección. */}
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <SinDatos
              queSon="cotizaciones"
              icono={Tray}
              titulo={t('inmobiliaria.ai.cotizador.overview.empty.title')}
              descripcion={t('inmobiliaria.ai.cotizador.overview.empty.description')}
              crear={{
                label: t('inmobiliaria.ai.cotizador.overview.empty.cta.label'),
                href: '/panel/inmobiliaria/postulaciones/asegurabilidad/nueva',
              }}
            />
          </div>
          {/* Aquí iba «Consultas que necesitan atención»: leía la misma cola
              vacía de «Por revisar» y nunca podía tener nada (05-10-2026). */}
        </>
      ) : (
        <>
          {/* KPI Strip */}
          <CotizadorKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />

          {/* Recent Quotes Feed */}
          <section aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}>
            <h2 className="text-base font-semibold text-fg mb-3">
              {t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}
            </h2>
            <CotizadorRecentQuotesFeed quotes={mergedQuotes} isLoading={isLoading} />
          </section>

          {/* Carriers Status */}
          <section aria-label={t('inmobiliaria.ai.cotizador.overview.carriers.title')}>
            <h2 className="text-base font-semibold text-fg mb-3">
              {t('inmobiliaria.ai.cotizador.overview.carriers.title')}
            </h2>
            <CotizadorCarriersStatus carriers={data?.carriers ?? []} isLoading={isLoading} />
          </section>

        </>
      )}
      </CrossFade>
    </div>
    </CrossFade>
  )
}
