'use client'

/**
 * aseguradoras/[carrier]/page.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * Per-carrier deep-dive page: KPI strip + latency sparkline + error rate chart +
 * approval by canon chart + last-50 quotes table.
 *
 * Permissions: handled by cotizador layout (Phase 29). No re-check here.
 * Route params: accessed via useParams() — required for 'use client' pages.
 */

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarrierDetail } from '@/lib/hooks/cotizador/use-carrier-detail'
import { useCarrierRecentQuotes } from '@/lib/hooks/cotizador/use-carrier-recent-quotes'
import { CarrierDeepDiveKpiStrip } from '@/components/inmobiliaria/cotizador/CarrierDeepDiveKpiStrip'
import { CarrierLatencySparkline } from '@/components/inmobiliaria/cotizador/CarrierLatencySparkline'
import { CarrierErrorRateChart } from '@/components/inmobiliaria/cotizador/CarrierErrorRateChart'
import { CarrierApprovalByCanonChart } from '@/components/inmobiliaria/cotizador/CarrierApprovalByCanonChart'
import { CarrierRecentQuotesTable } from '@/components/inmobiliaria/cotizador/CarrierRecentQuotesTable'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button } from '@/components/ui/button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelAgente } from './fallo-del-agente'
import { CrossFade } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'

// =============================================================================
// Component
// =============================================================================

export default function CarrierDeepDivePage() {
  const { t } = useI18n()
  const params = useParams()
  const carrier = params.carrier as string

  const { data: detail, isLoading, error, refetch } = useCarrierDetail(carrier)
  const { data: recentQuotes, isLoading: quotesLoading } = useCarrierRecentQuotes(carrier)

  // Phase 38-05b: skeleton only (D-38-04: dynamic detail route, no EmptyState).
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // contenido); lo que ya estaba al montarse no se anima.
  if (isLoading && !detail) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="detail" />
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="aseguradora">
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <VolverALaLista
          href="/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras"
          label={t('inmobiliaria.ai.cotizador.aseguradoras.backToList')}
        />
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.ai.nav.cotizador')}
          titulo={carrier.toUpperCase()}
          descripcion={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.subtitle')}
          acciones={
            <>
              <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
                <ArrowClockwise className="h-4 w-4" aria-hidden="true" />
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
              </Button>
              <Button variant="outline" size="sm" hideArrow asChild>
                <Link href="./sla">{t('inmobiliaria.ai.cotizador.aseguradoras.carrier.slaLinkLabel')}</Link>
              </Button>
            </>
          }
        />
      </div>

      {/* Fallo con datos ya en pantalla (el sondeo de 60 s tropezó): el cartel
          dice qué pasó y deja lo que ya se veía. Antes decía «…errorLoading: 502»,
          con la clave i18n cruda y el status suelto. */}
      {error && !isLoading && (
        <FalloDeCarga
          error={falloDelAgente(error)}
          queEs="los datos de esta aseguradora"
          onReintentar={refetch}
        />
      )}

      {/* KPI strip */}
      <CarrierDeepDiveKpiStrip kpis={detail?.kpis ?? null} isLoading={isLoading} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latency sparkline */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.latency.title')}
          </p>
          <CarrierLatencySparkline data={detail?.latencySparkline ?? []} isLoading={isLoading} />
        </div>

        {/* Error rate chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.title')}
          </p>
          <CarrierErrorRateChart data={detail?.errorRateSeries ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Approval by canon — full width */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-caption font-medium uppercase tracking-wide text-fg-muted mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.approvalByCanon.title')}
        </p>
        <CarrierApprovalByCanonChart data={detail?.approvalByCanon ?? []} isLoading={isLoading} />
      </div>

      {/* Recent quotes table — full width */}
      <section>
        <h2 className="text-caption font-medium uppercase tracking-wide text-fg-muted mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.title')}
        </h2>
        <CarrierRecentQuotesTable quotes={recentQuotes ?? null} isLoading={quotesLoading} />
      </section>
    </div>
    </CrossFade>
  )
}
