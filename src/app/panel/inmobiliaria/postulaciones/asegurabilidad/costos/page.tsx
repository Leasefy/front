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

import { formatCurrency } from '@/lib/types/inmobiliaria'
import { useState } from 'react'
import { Coins, MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { useI18n } from '@/lib/i18n'
import { useCostos } from '@/lib/hooks/cotizador/use-costos'
import { CostKpiStrip } from '@/components/inmobiliaria/cotizador/CostKpiStrip'
import { CostSourcePieChart } from '@/components/inmobiliaria/cotizador/CostSourcePieChart'
import { MonthlyCostTrendChart } from '@/components/inmobiliaria/cotizador/MonthlyCostTrendChart'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import { CrossFade } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

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
  // Ronda 30 (regla de Nico: toda tabla con buscador y paginación): la tabla de fuentes busca por el nombre de la
  // fuente y se pagina con el pie de la casa. Los hooks van antes del esqueleto (que retorna temprano).
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState<number>(PAGE_SIZE_OPTIONS[0])

  // Phase 38-05b: page-level skeleton on initial load only (D-38-04: skeleton only;
  // per-section table skeleton + inline empty prose preserved below; no EmptyState since
  // costos uses Phase 35 SampleDataWatermark semantics — no "truly nothing" zero state).
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // contenido); lo que ya estaba al montarse no se anima.
  if (isLoadingSummary && !summaryData) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="dashboard" />
      </CrossFade>
    )
  }

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
  const plano = (v?: string | null) =>
    (v ?? '').toLocaleLowerCase('es-CO').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const filasVisibles = busqueda.trim()
    ? tableRows.filter((r) => plano(r.label).includes(plano(busqueda.trim())))
    : tableRows
  const ultimaPagina = Math.max(1, Math.ceil(filasVisibles.length / porPagina))
  const paginaActual = Math.min(pagina, ultimaPagina)
  const filasDeLaPagina = filasVisibles.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  return (
    <CrossFade swapKey="costos">
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t('inmobiliaria.ai.cotizador.costos.pageTitle')}
        descripcion={t('inmobiliaria.ai.cotizador.costos.pageSubtitle')}
      />

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
          <h2 className="text-base font-medium text-fg mb-4">
            {t('inmobiliaria.ai.cotizador.costos.charts.costSourcePie.title')}
          </h2>
          <CostSourcePieChart
            sources={summaryData?.sources ?? null}
            costSources={summaryData?.costSources ?? []}
            isLoading={isLoadingSummary}
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-medium text-fg mb-4">
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
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-medium text-fg">
            {t('inmobiliaria.ai.cotizador.costos.sourceBreakdownTitle')}
          </h2>
          {tableRows.length > 0 ? (
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <Input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                placeholder="Buscar una fuente"
                aria-label="Buscar una fuente de costo"
                className="h-9 pl-9"
                data-testid="costos-buscar"
              />
            </div>
          ) : null}
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
                    descripcion="Cuando una consulta consuma modelo, API de aseguradora o comisión, el gasto aparece aquí por fuente."
                  />
                </TableCell>
              </TableRow>
            ) : filasVisibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNAS} className="p-0">
                  <SinDatos queSon="fuentes de costo" hayFiltros onLimpiarFiltros={() => setBusqueda('')} />
                </TableCell>
              </TableRow>
            ) : (
              filasDeLaPagina.map(row => (
                <TableRow key={row.key} className="hover:bg-surface-muted/50">
                  <TableCell className="px-4 py-3 text-sm text-fg">
                    {row.label}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono tabular-nums text-right text-fg">
                    {row.total > 0 ? formatCurrency(row.total) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {/* QA-IA-A: «Con datos» al lado de «—» se contradecía; con
                        datos es que haya gasto, no que la fuente esté cableada. */}
                    {row.populated && row.total > 0 ? (
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
        {filasVisibles.length > 0 ? (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={filasVisibles.length}
              page={paginaActual}
              pageSize={porPagina}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPagina}
              onPageSizeChange={(n) => {
                setPorPagina(n)
                setPagina(1)
              }}
            />
          </div>
        ) : null}
      </section>
      </>
      )}
    </div>
    </CrossFade>
  )
}
