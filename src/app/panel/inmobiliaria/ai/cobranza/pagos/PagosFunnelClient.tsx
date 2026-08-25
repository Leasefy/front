'use client'

/**
 * PagosFunnelClient — Phase 32 plan 32-07 (COBR-UI-05).
 *
 * Operator funnel for `cobranza/pagos`:
 *  - Tira de 6 indicadores, en el orden del recorrido de la plata:
 *    por cobrar → en proceso → aprobados → rechazados → recaudado → desembolsado
 *  - Date-window selector (today / 7d / 30d (default) / 90d / mtd)
 *  - Multi-select chip filters (provider, estado)
 *  - Sortable table (created_at DESC default, amount DESC, disbursement_pending_days DESC)
 *  - ⚠ pill when disbursementPendingDays >= 3 (nunca sobre una obligación:
 *    no se demora el desembolso de una plata que no entró)
 *  - Row click → /pagos/planes/{planId} (pending + payment_plan) or /pagos/{paymentId}
 *  - <Mask> wraps every debtor name; no raw PII in DOM
 *  - Paginación numerada (el scroll infinito se cambió por páginas)
 *
 * El vocabulario de estados vive en `@/lib/cobranza/pago-vocab` — ahí está
 * explicado por qué una obligación importada no es un pago pendiente.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CurrencyCircleDollar } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, Chip, SegmentedControl } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import {
  usePaymentsFunnel,
  type UsePaymentsFunnelFilters,
  type PaymentsFunnelItem,
  type PaymentsFunnelKpis,
  type PaymentsFunnelSort,
} from '@/lib/hooks/cobranza/use-payments-funnel'
import {
  ESTADOS_VISIBLES,
  ESTADO_A_FILTRO,
  estadoBadgeVariant,
  estadoVisible,
  type EstadoVisible,
} from '@/lib/cobranza/pago-vocab'

void React

type Provider = 'wompi' | 'bold'
type DateWindow = NonNullable<UsePaymentsFunnelFilters['dateWindow']>

const PROVIDERS: Provider[] = ['wompi', 'bold']
const DATE_WINDOWS: DateWindow[] = ['today', '7d', '30d', '90d', 'mtd']

/**
 * Columnas de la tabla: nombre · monto · proveedor · estado · desembolso · fecha.
 * Lo usan el esqueleto y el `colSpan` del vacío; con un número suelto en cada
 * lado, quitar una columna dejaba el esqueleto y el mensaje descuadrados.
 */
const COLUMNAS = 6

const copFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

function providerBadgeVariant(provider: Provider): 'default' | 'secondary' {
  return provider === 'wompi' ? 'default' : 'secondary'
}

function KpiCard({
  testId,
  label,
  value,
  hint,
  isLoading,
}: {
  testId: string
  label: string
  value: string
  /** Línea de apoyo: un monto sin saber sobre cuántas filas se calcula dice a medias. */
  hint?: string
  isLoading: boolean
}) {
  return (
    <Card data-testid={testId} className="px-4 py-3">
      <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-surface-muted" />
      ) : (
        // Los números van monoespaciados y tabulares para que las columnas de
        // cifras se alineen entre tarjetas.
        <p className="mt-1 text-lg font-semibold text-fg font-mono tabular-nums">
          {value}
        </p>
      )}
      {!isLoading && hint && (
        <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>
      )}
    </Card>
  )
}

export default function PagosFunnelClient() {
  const { t } = useI18n()
  const router = useRouter()

  // ── Filter state ──────────────────────────────────────────────────────────
  const [dateWindow, setDateWindow] = useState<DateWindow>('30d')
  const [providers, setProviders] = useState<Provider[]>([])
  const [statuses, setStatuses] = useState<EstadoVisible[]>([])
  const [sort, setSort] = useState<PaymentsFunnelSort>('created_at')

  // ── Hook filters ──────────────────────────────────────────────────────────
  const filters = useMemo<UsePaymentsFunnelFilters>(
    () => ({
      provider: providers.length > 0 ? providers.join(',') : undefined,
      status:
        statuses.length > 0
          ? statuses.map((s) => ESTADO_A_FILTRO[s]).join(',')
          : undefined,
      dateWindow,
      sort,
    }),
    [providers, statuses, dateWindow, sort],
  )

  const { rows, kpis, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    usePaymentsFunnel(filters)

  // ── Paginación ────────────────────────────────────────────────────────────
  //
  // Páginas numeradas, igual que Llamadas y Cartas, en vez del scroll infinito
  // que había: un paginador dice cuántos pagos hay y deja volver a una página,
  // dos cosas que el scroll infinito no permite.
  //
  // El endpoint pagina por cursor del lado del servidor, así que se recorta en
  // memoria lo YA cargado y se pide el siguiente tramo al llegar a la última
  // página. Las dos mecánicas conviven sin pelearse.
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(rows, {
    resetKey: `${providers.join(',')}|${statuses.join(',')}|${dateWindow}|${sort}`,
  })

  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    if (page >= lastPage && hasMore && !isLoadingMore) {
      void loadMore()
    }
  }, [page, lastPage, hasMore, isLoadingMore, loadMore])

  // Phase 38-05a: hasActiveFilters discriminates between "no payments yet"
  // (page-level EmptyState with CTA) and "no payments match these filters"
  // (existing inline emptyFiltered branch — preserves filter controls).
  const hasActiveFilters =
    providers.length > 0 || statuses.length > 0 || dateWindow !== '30d' || sort !== 'created_at'

  // Phase 38-05a: dashboard skeleton during initial fetch (before any KPI lands).
  if (isLoading && rows.length === 0 && !kpis) {
    return <PageSkeleton variant="dashboard" />
  }

  // Phase 38-05a: page-level EmptyState only when zero results AND no filters
  // are active. With filters, the inline emptyFiltered branch (line ~394)
  // keeps the chip controls reachable so the operator can clear filters.
  if (!isLoading && !error && rows.length === 0 && !hasActiveFilters) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            {t('inmobiliaria.ai.cobranza.pagos.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {t('inmobiliaria.ai.cobranza.pagos.subtitle')}
          </p>
        </header>
        <EmptyState
          icon={CurrencyCircleDollar}
          title={t('inmobiliaria.ai.cobranza.pagos.empty.title')}
          description={t('inmobiliaria.ai.cobranza.pagos.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cobranza.pagos.empty.cta.label'),
            href: '/panel/inmobiliaria/ai/cobranza/deudores',
          }}
        />
      </main>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleProvider = (p: Provider) => {
    setProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }
  const toggleStatus = (s: EstadoVisible) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }
  const clearFilters = () => {
    setProviders([])
    setStatuses([])
    setDateWindow('30d')
    setSort('created_at')
  }
  const handleRowClick = (row: PaymentsFunnelItem) => {
    // Phase 32 contract: pending + payment_plan rows route to the plan approval page;
    // all other rows route to the read-only payment detail page.
    if (row.status === 'pending' && row.paymentPlanId) {
      router.push(`/panel/inmobiliaria/ai/cobranza/pagos/planes/${row.paymentPlanId}`)
    } else {
      router.push(`/panel/inmobiliaria/ai/cobranza/pagos/${row.id}`)
    }
  }

  // ── KPI strip render helper ───────────────────────────────────────────────
  //
  // El orden sigue el recorrido de la plata: lo que se debe → lo que está en
  // camino → lo que se confirmó o se cayó → lo que entró → lo que se giró.
  //
  // Ya NO está «Comisión promedio»: lo calculaba sobre `payments.fee_amount`,
  // una columna que no escribe ningún writer del agente (ni el webhook de la
  // pasarela, que ni siquiera lee la comisión del payload). Un «—» fijo se
  // leía como «no hubo comisión». Para reponerla hay que empezar por el
  // writer, no por la tarjeta.
  const renderKpis = (k: PaymentsFunnelKpis | null) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <KpiCard
        testId="pagos-kpi-por-cobrar"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrar')}
        value={formatCop(k?.porCobrarCop ?? 0)}
        hint={
          k
            ? k.porCobrarCount === 1
              ? t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrarHintOne')
              : t('inmobiliaria.ai.cobranza.pagos.kpi.porCobrarHint', {
                  count: k.porCobrarCount,
                })
            : undefined
        }
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-en-proceso"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.enProceso')}
        value={String(k?.enProcesoCount ?? 0)}
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-approved"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.approved')}
        value={String(k?.approvedCount ?? 0)}
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-declined"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.declined')}
        value={String(k?.declinedCount ?? 0)}
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-recaudado"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.recaudado')}
        value={formatCop(k?.totalRecaudadoCop)}
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-disbursed"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.disbursed')}
        value={formatCop(k?.totalDisbursedCop)}
        isLoading={isLoading && !k}
      />
    </div>
  )

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {t('inmobiliaria.ai.cobranza.pagos.title')}
        </h1>
        <p className="text-sm text-fg-muted mt-0.5">
          {t('inmobiliaria.ai.cobranza.pagos.subtitle')}
        </p>
      </header>

      {/* KPI strip */}
      {renderKpis(kpis)}

      {/*
        Una sola tarjeta: barra de herramientas, tabla y pie de paginación.
        Antes el selector de fechas, los filtros y el orden flotaban sueltos
        ENCIMA de la tarjeta, así que la pantalla se leía como tres bloques sin
        relación en vez de una tabla con sus controles.
      */}
      <Card className="overflow-hidden">
      {/*
        Barra en DOS filas que usan el ancho, no tres apiladas contra el borde
        izquierdo: lo excluyente (ventana temporal, orden) arriba y a los
        extremos; lo acumulable (proveedor, estado) abajo.
      */}
      <div className="border-b border-border px-4 py-3 space-y-2.5">
        {/* Fila 1 — ventana temporal · orden */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<DateWindow>
            value={dateWindow}
            onChange={setDateWindow}
            aria-label={t('inmobiliaria.ai.cobranza.pagos.dateWindow.label')}
            options={DATE_WINDOWS.map((w) => ({
              value: w,
              label: t(`inmobiliaria.ai.cobranza.pagos.dateWindow.${w}`),
            }))}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="pagos-sort" className="text-xs font-medium text-fg-muted">
              {t('inmobiliaria.ai.cobranza.pagos.sort.label')}:
            </label>
            <Select value={sort} onValueChange={(v) => setSort(v as PaymentsFunnelSort)}>
              <SelectTrigger
                id="pagos-sort"
                data-testid="pagos-sort-select"
                className="h-8 w-auto gap-1 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">
                  {t('inmobiliaria.ai.cobranza.pagos.sort.createdAt')}
                </SelectItem>
                <SelectItem value="amount">
                  {t('inmobiliaria.ai.cobranza.pagos.sort.amountDesc')}
                </SelectItem>
                <SelectItem value="disbursement_pending_days">
                  {t('inmobiliaria.ai.cobranza.pagos.sort.disbursementPendingDays')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fila 2 — filtros acumulables · limpiar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <fieldset>
            <legend className="text-xs font-medium text-fg-muted mr-2 inline">
              {t('inmobiliaria.ai.cobranza.pagos.filter.provider')}:
            </legend>
            <span className="inline-flex flex-wrap gap-1.5 align-middle">
              {PROVIDERS.map((p) => (
                <Chip
                  key={p}
                  size="sm"
                  selected={providers.includes(p)}
                  onClick={() => toggleProvider(p)}
                  data-testid={`pagos-provider-chip-${p}`}
                >
                  {t(`inmobiliaria.ai.cobranza.pagos.filter.${p}`)}
                </Chip>
              ))}
            </span>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium text-fg-muted mr-2 inline">
              {t('inmobiliaria.ai.cobranza.pagos.filter.status')}:
            </legend>
            <span className="inline-flex flex-wrap gap-1.5 align-middle">
              {ESTADOS_VISIBLES.map((st) => (
                <Chip
                  key={st}
                  size="sm"
                  selected={statuses.includes(st)}
                  onClick={() => toggleStatus(st)}
                  data-testid={`pagos-status-chip-${ESTADO_A_FILTRO[st]}`}
                >
                  {t(`inmobiliaria.ai.cobranza.pagos.status.${st}`)}
                </Chip>
              ))}
            </span>
          </fieldset>

          {/* Sólo cuando hay algo que limpiar: un botón que no hace nada es ruido. */}
          {hasActiveFilters && (
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={clearFilters}
              className="ml-auto px-0 h-auto"
            >
              {t('inmobiliaria.ai.cobranza.pagos.filter.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-border bg-danger-soft px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-danger">
            {t('inmobiliaria.ai.cobranza.pagos.error')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            className="shrink-0"
          >
            {t('inmobiliaria.ai.cobranza.pagos.errorRetry')}
          </Button>
        </div>
      )}

      {/* Table */}
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.nombre')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-fg"
                onClick={() => setSort('amount')}
                data-testid="pagos-th-monto"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.monto')}
                {sort === 'amount' && <span className="ml-1">↓</span>}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.provider')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.status')}
              </TableHead>
              {/* El endpoint ya mandaba `disbursementState` y nadie lo mostraba,
                  en la pantalla que se llama «funnel de pagos y desembolsos». */}
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.disbursement')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-fg"
                onClick={() => setSort('created_at')}
                data-testid="pagos-th-fecha"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.fecha')}
                {sort === 'created_at' && <span className="ml-1">↓</span>}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && rows.length === 0 && (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`pagos-skel-${i}`} className="animate-pulse">
                  {Array.from({ length: COLUMNAS }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-surface-muted rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!isLoading && rows.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={COLUMNAS} className="px-3 py-12 text-center">
                  <p className="text-sm text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.pagos.emptyFiltered')}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((row) => {
              const estado = estadoVisible(row)
              const esObligacion = row.kind === 'obligacion'
              const isPending = row.disbursementPendingDays >= 3
              return (
                <TableRow
                  key={row.id}
                  data-testid={`pagos-row-${row.id}`}
                  onClick={() => handleRowClick(row)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRowClick(row)
                  }}
                  className=" cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    <span className="text-fg">{row.debtor.fullName}</span>
                    <span className="block text-xs text-fg-subtle">
                      <Mask field="cedula" value={row.debtor.cedulaMasked} />
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums text-xs text-fg">
                    {formatCop(row.amount)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {row.provider ? (
                      <Badge variant={providerBadgeVariant(row.provider)}>
                        {t(`inmobiliaria.ai.cobranza.pagos.filter.${row.provider}`)}
                      </Badge>
                    ) : (
                      // Sin pasarela todavía. Antes esto interpolaba `null` en
                      // la clave y pintaba `…pagos.filter.null` en cada fila.
                      //
                      // Y para una obligación no es «todavía»: nadie intentó
                      // pagarla, así que no hay pasarela pendiente de asignar.
                      <span className="text-xs text-fg-subtle">
                        {t(
                          esObligacion
                            ? 'inmobiliaria.ai.cobranza.pagos.provider.noAplica'
                            : 'inmobiliaria.ai.cobranza.pagos.provider.none',
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={estadoBadgeVariant(estado)}>
                        {t(`inmobiliaria.ai.cobranza.pagos.status.${estado}`)}
                      </Badge>
                      {isPending && (
                        <Badge
                          variant="warning"
                          data-testid={`pagos-pending-pill-${row.id}`}
                          className="gap-1"
                        >
                          <span aria-hidden="true">⚠</span>
                          {t('inmobiliaria.ai.cobranza.pagos.pill.disbursementPending')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    {/*
                      No se puede desembolsar una plata que nunca entró: para
                      una obligación este paso no existe. «Sin desembolsar»
                      insinuaba un giro atrasado sobre una deuda sin pagar.
                    */}
                    {esObligacion ? (
                      <span className="text-xs text-fg-subtle">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.noAplica')}
                      </span>
                    ) : row.disbursementState === 'settled' ? (
                      <Badge variant="success">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.settled')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-fg-muted">
                        {t('inmobiliaria.ai.cobranza.pagos.disbursement.pending')}
                        {row.disbursementPendingDays > 0 && (
                          <span className="text-fg-subtle">
                            {' · '}
                            {t('inmobiliaria.ai.cobranza.pagos.disbursement.days', {
                              days: row.disbursementPendingDays,
                            })}
                          </span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-fg-muted whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>

        {/* Pie: sólo si hay más de una página — un paginador que no pagina es ruido. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>
    </main>
  )
}
