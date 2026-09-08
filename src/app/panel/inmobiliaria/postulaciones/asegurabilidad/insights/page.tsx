'use client'

// Permissions gate enforced by cotizador layout.tsx (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

import { useI18n } from '@/lib/i18n'
import { useInsights } from '@/lib/hooks/cotizador/use-insights'
import { ApprovalRateMonthlyChart } from '@/components/inmobiliaria/cotizador/ApprovalRateMonthlyChart'
import { PrimaDistributionChart } from '@/components/inmobiliaria/cotizador/PrimaDistributionChart'
import { InsightsAssumptionTable } from '@/components/inmobiliaria/cotizador/InsightsAssumptionTable'
import { InsightsMonthlyCostPreview } from '@/components/inmobiliaria/cotizador/InsightsMonthlyCostPreview'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SectionLabel } from '@/components/ui/section-label'

/**
 * Cuatro widgets, los cuatro con dato detrás. Había dos más —«Calidad de
 * match de cohorte» y «Reporte de drift»— que sólo decían «Disponible
 * próximamente»: no leían de ningún endpoint. Lo que no va a producción no
 * se promete; cuando tengan dato, vuelven con él.
 */
export default function CotizadorInsightsPage() {
  const { t } = useI18n()

  const {
    approvalRateMonthly,
    primaDistribution,
    assumptions,
    monthlyCostTrend,
    isLoading,
    error,
    refetch,
  } = useInsights()

  // Phase 38-05b: PageSkeleton replaces inline animate-pulse grid (D-38-04: skeleton only).
  if (isLoading && approvalRateMonthly.length === 0) return <PageSkeleton variant="dashboard" />

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa */}
      <header className="space-y-1.5">
        <SectionLabel>{t('inmobiliaria.ai.nav.cotizador')}</SectionLabel>
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.cotizador.insights.title')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
          {t('inmobiliaria.ai.cotizador.insights.subtitle')}
        </p>
      </header>

      {/* El fallo reemplaza los datos, no se apila debajo de ellos: cuatro
          gráficos vacíos con un cartel rojo arriba afirman y desmienten a la
          vez. El cartel decide solo si reintentar tiene sentido. */}
      {error && !isLoading ? (
        <FalloDeCarga
          error={error}
          queEs="los insights de asegurabilidad"
          onReintentar={refetch}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Widget 1 — Approval Rate Monthly (full-row at md) */}
          <section className="rounded-lg border border-border bg-surface p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.cotizador.insights.sections.approvalRate')}
            </h2>
            <ApprovalRateMonthlyChart
              data={approvalRateMonthly.length > 0 ? approvalRateMonthly : (isLoading ? null : [])}
              isLoading={isLoading && approvalRateMonthly.length === 0}
            />
          </section>

          {/* Widget 2 — Prima Distribution */}
          <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.cotizador.insights.sections.primaDistribution')}
            </h2>
            <PrimaDistributionChart
              data={primaDistribution.length > 0 ? primaDistribution : (isLoading ? null : [])}
              isLoading={isLoading && primaDistribution.length === 0}
            />
          </section>

          {/* Widget 3 — Assumption Registry Table (la tabla trae su propio
              recuadro: no se anida en otro) */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.cotizador.insights.sections.assumptions')}
            </h2>
            <InsightsAssumptionTable
              assumptions={assumptions.length > 0 ? assumptions : (isLoading ? null : [])}
              isLoading={isLoading && assumptions.length === 0}
            />
          </section>

          {/* Widget 4 — Monthly Cost Preview */}
          <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.cotizador.insights.sections.costTrend')}
            </h2>
            <InsightsMonthlyCostPreview
              trend={monthlyCostTrend.length > 0 ? monthlyCostTrend : (isLoading ? null : [])}
              isLoading={isLoading && monthlyCostTrend.length === 0}
            />
          </section>
        </div>
      )}
    </main>
  )
}
