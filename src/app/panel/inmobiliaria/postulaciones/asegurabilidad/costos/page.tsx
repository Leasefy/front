'use client'

/**
 * costos/page.tsx — Phase 35 plan 35-10 (COTI-UI-09)
 *
 * Cost dashboard for agency owners/admins.
 * Exposes: cost-per-quote KPI, monthly burn, 30-day forecast, cost-by-source pie,
 * monthly trend chart, and a per-source breakdown table.
 *
 * Permissions: cotizador layout (Phase 29) wraps this route with PageGuard.
 * This page does NOT re-check permissions.
 *
 * Polling:
 *   - KPI strip: 30s (via useCostos → fetchSummary)
 *   - Charts: 60s (via useCostos → fetchSeries)
 */

import { Coins } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCostos } from '@/lib/hooks/cotizador/use-costos'
import { CostKpiStrip } from '@/components/inmobiliaria/cotizador/CostKpiStrip'
import { CostSourcePieChart } from '@/components/inmobiliaria/cotizador/CostSourcePieChart'
import { MonthlyCostTrendChart } from '@/components/inmobiliaria/cotizador/MonthlyCostTrendChart'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/ui/section-label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'

const COLUMNAS = 3

/** Filas esqueleto con las mismas columnas que la tabla real. */
function FilasDeCarga() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i} className="animate-pulse" aria-hidden="true">
          {Array.from({ length: COLUMNAS }).map((__, j) => (
            <TableCell key={j} className="px-4 py-3">
              <div className="h-4 w-24 rounded bg-surface-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export default function CostosPage() {
  const { t } = useI18n()
  const {
    summaryData,
    seriesData,
    isLoadingSummary,
    isLoadingSeries,
    summaryError,
    seriesError,
    refetchSummary,
    refetchSeries,
  } = useCostos()

  // Phase 38-05b: page-level skeleton on initial load only (D-38-04: skeleton only;
  // per-section table skeleton + inline empty prose preserved below; no EmptyState since
  // costos uses Phase 35 SampleDataWatermark semantics — no "truly nothing" zero state).
  if (isLoadingSummary && !summaryData) return <PageSkeleton variant="dashboard" />

  // Derive table rows by joining costSources registry labels with source totals
  const tableRows = (summaryData?.costSources ?? []).map(src => ({
    key: src.key,
    label: src.label,
    populated: src.populated,
    // Backend sends totals keyed as anthropicTotal, carrierApiTotal, etc.
    // parseFloat() guards against string values (backend may return strings per plan spec)
    total: parseFloat(
      String(
        summaryData?.sources[`${src.key.replace(/_([a-z])/g, (_m: string, l: string) => l.toUpperCase())}Total` as keyof typeof summaryData.sources] ?? 0
      )
    ),
  }))

  const tablaCargando = (isLoadingSummary || isLoadingSeries) && tableRows.length === 0

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa */}
      <header className="space-y-1.5">
        <SectionLabel>{t('inmobiliaria.ai.nav.cotizador')}</SectionLabel>
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.cotizador.costos.pageTitle')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
          {t('inmobiliaria.ai.cotizador.costos.pageSubtitle')}
        </p>
      </header>

      {/* El fallo va ACÁ ARRIBA y reemplaza los datos, no debajo de ellos.
          Estaba al final de la página: se veían los KPI en cero, la tabla
          diciendo «no hay fuentes de costo», y recién abajo del todo —fuera de
          pantalla— un cartel rojo avisando que nada de eso se había podido
          traer. La pantalla afirmaba y desmentía en el mismo scroll. */}
      {summaryError || seriesError ? (
        <FalloDeCarga
          error={summaryError ?? seriesError}
          queEs="los costos"
          onReintentar={() => {
            void refetchSummary()
            void refetchSeries()
          }}
        />
      ) : (
      <>
      {/* KPI strip — 30s polling (separate from charts per D-35-08) */}
      <CostKpiStrip kpis={summaryData?.kpis ?? null} isLoading={isLoadingSummary} />

      {/* Main charts row: pie (left) + trend line (right) — side-by-side on md+ (D-35-09 / XR-03) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-fg mb-4">
            {t('inmobiliaria.ai.cotizador.costos.charts.costSourcePie.title')}
          </h2>
          <CostSourcePieChart
            sources={summaryData?.sources ?? null}
            costSources={summaryData?.costSources ?? []}
            isLoading={isLoadingSummary}
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-fg mb-4">
            {t('inmobiliaria.ai.cotizador.costos.charts.monthlyCostTrend.title')}
          </h2>
          <MonthlyCostTrendChart
            rows={(seriesData?.rows ?? []).map(r => ({
              period: r.period,
              // parseFloat() guard — backend may return cost values as strings
              total: parseFloat(String(r.total)),
              isForecast: r.isForecast,
            }))}
            isLoading={isLoadingSeries}
          />
        </section>
      </div>

      {/* Per-source breakdown table — la tabla de la casa: la carga y el
          vacío viven dentro del cuerpo, con la cabecera siempre a la vista. */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.cotizador.costos.sourceBreakdownTitle')}
          </h2>
        </div>
        <Table className="min-w-full divide-y divide-border">
          <TableHeader className="bg-surface-muted/60">
            <TableRow>
              <TableHead className="px-4 py-3 text-left">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colSource')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colTotal')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colStatus')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {tablaCargando ? (
              <FilasDeCarga />
            ) : tableRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNAS} className="p-0">
                  <SinDatos
                    queSon="fuentes de costo"
                    icono={Coins}
                    titulo={t('inmobiliaria.ai.cotizador.costos.noCostSources')}
                    descripcion="Cuando una consulta consuma modelo, API de aseguradora o comisión, el gasto aparece acá por fuente."
                  />
                </TableCell>
              </TableRow>
            ) : (
              tableRows.map(row => (
                <TableRow key={row.key} className="hover:bg-surface-muted/50">
                  <TableCell className="px-4 py-3 text-sm text-fg">
                    {row.label}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono tabular-nums text-right text-fg">
                    {row.total > 0 ? `$${row.total.toFixed(4)}` : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {row.populated ? (
                      <Badge variant="outline" className="text-success border-success/30">
                        {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.statusPopulated')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-fg-muted">
                        {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.statusEmpty')}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
      </>
      )}
    </main>
  )
}
