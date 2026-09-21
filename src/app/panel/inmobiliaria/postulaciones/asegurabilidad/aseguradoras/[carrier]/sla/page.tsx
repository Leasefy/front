'use client'

/**
 * aseguradoras/[carrier]/sla/page.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * SLA sub-page: state card (emerald/amber/rose) + 30d sparklines + breach windows table.
 *
 * Permissions: handled by cotizador layout (Phase 29). No re-check here.
 * Route params: accessed via useParams() — required for 'use client' pages.
 */

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowClockwise, ChartLine } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarrierSla } from '@/lib/hooks/cotizador/use-carrier-sla'
import { CarrierSlaStateCard } from '@/components/inmobiliaria/cotizador/CarrierSlaStateCard'
import { CarrierSlaBreachWindows } from '@/components/inmobiliaria/cotizador/CarrierSlaBreachWindows'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelAgente } from '../fallo-del-agente'

// =============================================================================
// Component
// =============================================================================

export default function CarrierSlaPage() {
  const { t } = useI18n()
  const params = useParams()
  const carrier = params.carrier as string

  const { data: sla, isLoading, error, refetch } = useCarrierSla(carrier)

  // Phase 38-05b: skeleton + EmptyState early returns (D-38-04: SLA sub-page gets both, no CTA).
  // i18n note: using existing `aseguradoras.sla.empty.*` keys scaffolded by 38-02 (verbatim D-38-04 copy);
  // the plan's literal `aseguradoras.carrier.sla.empty.*` path was a parallel namespace not wired in i18n
  // — reusing already-scaffolded keys avoids adding orphan strings under an unwired `carrier` namespace.
  if (isLoading && !sla) return <PageSkeleton variant="list" />
  /*
   * Sin datos Y con error, el agente no contestó: eso no es «todavía no hay
   * cumplimiento que mostrar». Esta guarda va ANTES del vacío, que si no se
   * quedaba con el caso (`!sla`) y un agente caído se leía como una
   * aseguradora sin historia.
   */
  if (error && !sla) {
    return (
      <main className="space-y-6 p-6 lg:p-8">
        {/* 🔴 20-09 · El camino de vuelta va ARRIBA, no sólo dentro de la
            tarjeta: un fallo a pantalla completa sin encabezado no dice en qué
            parte del panel estás (Nico: «ni se entiende y no tiene navegación
            para recuperarse»). Ver `el-fallo-de-una-ficha-tiene-salida`. */}
        <BackButton href="/panel/inmobiliaria/postulaciones/asegurabilidad" label="Asegurabilidad" />
        <h1 className="text-h2 text-fg">Cumplimiento de la aseguradora</h1>
        <FalloDeCarga
          error={falloDelAgente(error)}
          queEs="el cumplimiento de esta aseguradora"
          onReintentar={refetch}
          volverA={{
            label: 'Asegurabilidad',
            href: '/panel/inmobiliaria/postulaciones/asegurabilidad',
          }}
        />
      </main>
    )
  }
  if (
    !isLoading &&
    (!sla || (!sla.state && (!sla.breachWindows || sla.breachWindows.length === 0)))
  ) {
    return (
      <EmptyState
        icon={ChartLine}
        title={t('inmobiliaria.ai.cotizador.aseguradoras.sla.empty.title')}
        description={t('inmobiliaria.ai.cotizador.aseguradoras.sla.empty.description')}
      />
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href=".."
              className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {carrier.toUpperCase()}
            </Link>
          </div>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.title')} — {carrier.toUpperCase()}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          hideArrow
          onClick={() => void refetch()}
          aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
        >
          <ArrowClockwise className="h-4 w-4" />
        </Button>
      </header>

      {/* Fallo con datos ya en pantalla (el sondeo de 60 s tropezó): el cartel
          dice qué pasó y deja lo que ya se veía. Antes decía «…errorLoading: 502»,
          con la clave i18n cruda y el status suelto. */}
      {error && !isLoading && (
        <FalloDeCarga
          error={falloDelAgente(error)}
          queEs="el cumplimiento de esta aseguradora"
          onReintentar={refetch}
        />
      )}

      {/* SLA state card with sparklines */}
      <CarrierSlaStateCard
        state={sla?.state ?? null}
        since={sla?.since ?? null}
        reason={sla?.reason ?? null}
        p95Sparkline={sla?.p95Sparkline ?? []}
        errorRateSparkline={sla?.errorRateSparkline ?? []}
        isLoading={isLoading}
      />

      {/* Breach windows table */}
      <CarrierSlaBreachWindows
        breachWindows={sla?.breachWindows ?? null}
        isLoading={isLoading}
      />
    </main>
  )
}
