'use client'

/**
 * PagosFunnelClient — Phase 32 plan 32-07 (COBR-UI-05).
 *
 * Operator funnel for `cobranza/pagos`:
 *  - 5-KPI strip (approved / pending / declined / recaudado / disbursed / avg fee)
 *  - Date-window selector (today / 7d / 30d (default) / 90d / mtd)
 *  - Multi-select chip filters (provider, status)
 *  - Sortable table (created_at DESC default, amount DESC, disbursement_pending_days DESC)
 *  - ⚠ pill when disbursementPendingDays >= 3
 *  - Row click → /pagos/planes/{planId} (pending + payment_plan) or /pagos/{paymentId}
 *  - <Mask> wraps every debtor name; no raw PII in DOM
 *  - IntersectionObserver sentinel for infinite scroll
 */

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Chip, SegmentedControl } from '@leasefy/cadence'
import {
  usePaymentsFunnel,
  type UsePaymentsFunnelFilters,
  type PaymentsFunnelItem,
  type PaymentsFunnelKpis,
  type PaymentsFunnelSort,
} from '@/lib/hooks/cobranza/use-payments-funnel'

void React

type Provider = 'wompi' | 'bold'
type Status = 'approved' | 'pending' | 'declined' | 'disbursed'
type DateWindow = NonNullable<UsePaymentsFunnelFilters['dateWindow']>

const PROVIDERS: Provider[] = ['wompi', 'bold']
const STATUSES: Status[] = ['approved', 'pending', 'declined', 'disbursed']
const DATE_WINDOWS: DateWindow[] = ['today', '7d', '30d', '90d', 'mtd']

const copFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

// Semantic status tints vía tokens del DS (contrato §8). Antes: bg/text del mismo
// hex → texto invisible; ahora soft-bg + texto sólido para contraste real.
function statusBadgeVariant(
  status: Status,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'declined':
      return 'destructive'
    case 'disbursed':
      return 'secondary'
  }
}

function providerBadgeVariant(provider: Provider): 'default' | 'secondary' {
  return provider === 'wompi' ? 'default' : 'secondary'
}

function KpiCard({
  testId,
  label,
  value,
  isLoading,
}: {
  testId: string
  label: string
  value: string
  isLoading: boolean
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-surface-muted" />
      ) : (
        <p className="mt-1 text-lg font-semibold text-fg">{value}</p>
      )}
    </div>
  )
}

export default function PagosFunnelClient() {
  const { t } = useI18n()
  const router = useRouter()

  // ── Filter state ──────────────────────────────────────────────────────────
  const [dateWindow, setDateWindow] = useState<DateWindow>('30d')
  const [providers, setProviders] = useState<Provider[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [sort, setSort] = useState<PaymentsFunnelSort>('created_at')

  // ── Hook filters ──────────────────────────────────────────────────────────
  const filters = useMemo<UsePaymentsFunnelFilters>(
    () => ({
      provider: providers.length > 0 ? providers.join(',') : undefined,
      status: statuses.length > 0 ? statuses.join(',') : undefined,
      dateWindow,
      sort,
    }),
    [providers, statuses, dateWindow, sort],
  )

  const { rows, kpis, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    usePaymentsFunnel(filters)

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!hasMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadMore()
          }
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore, rows.length])

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
  const toggleStatus = (s: Status) => {
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
  const renderKpis = (k: PaymentsFunnelKpis | null) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <KpiCard
        testId="pagos-kpi-approved"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.approved')}
        value={String(k?.approvedCount ?? 0)}
        isLoading={isLoading && !k}
      />
      <KpiCard
        testId="pagos-kpi-pending"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.pending')}
        value={String(k?.pendingCount ?? 0)}
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
      <KpiCard
        testId="pagos-kpi-avg-fee"
        label={t('inmobiliaria.ai.cobranza.pagos.kpi.avgFee')}
        value={formatCop(k?.avgFeeCop)}
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

      {/* Date-window selector — excluyente → SegmentedControl (contrato §3) */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SegmentedControl<DateWindow>
          value={dateWindow}
          onChange={setDateWindow}
          aria-label={t('inmobiliaria.ai.cobranza.pagos.title')}
          options={DATE_WINDOWS.map((w) => ({
            value: w,
            label: t(`inmobiliaria.ai.cobranza.pagos.dateWindow.${w}`),
          }))}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3 mb-4">
        <fieldset>
          <legend className="text-xs font-medium text-fg-muted mr-2 inline">
            {t('inmobiliaria.ai.cobranza.pagos.filter.provider')}:
          </legend>
          <span className="inline-flex flex-wrap gap-2 align-middle">
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
          <span className="inline-flex flex-wrap gap-2 align-middle">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                size="sm"
                selected={statuses.includes(s)}
                onClick={() => toggleStatus(s)}
                data-testid={`pagos-status-chip-${s}`}
              >
                {t(`inmobiliaria.ai.cobranza.pagos.status.${s}`)}
              </Chip>
            ))}
          </span>
        </fieldset>

        <Button
          variant="link"
          size="sm"
          hideArrow
          onClick={clearFilters}
          className="px-0 h-auto self-center"
        >
          {t('inmobiliaria.ai.cobranza.pagos.filter.clear')}
        </Button>
      </div>

      {/* Sort selector */}
      <div className="flex items-center gap-2 mb-4">
        <label
          htmlFor="pagos-sort"
          className="text-xs font-medium text-fg-muted"
        >
          Sort:
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
            <SelectItem value="created_at">{t('inmobiliaria.ai.cobranza.pagos.sort.createdAt')}</SelectItem>
            <SelectItem value="amount">{t('inmobiliaria.ai.cobranza.pagos.sort.amountDesc')}</SelectItem>
            <SelectItem value="disbursement_pending_days">
              {t('inmobiliaria.ai.cobranza.pagos.sort.disbursementPendingDays')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 mb-4 flex items-center justify-between gap-3">
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
      <div className="overflow-x-auto rounded-[20px] border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.nombre')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => setSort('amount')}
                data-testid="pagos-th-monto"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.monto')}
                {sort === 'amount' && <span className="ml-1">↓</span>}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.fee')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.provider')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.pagos.columns.status')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
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
                  {Array.from({ length: 6 }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-surface-muted rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!isLoading && rows.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-12 text-center">
                  <p className="text-sm text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.pagos.emptyFiltered')}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
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
                  <TableCell className="px-3 py-2 whitespace-nowrap text-fg">
                    <Mask field="cedula" value={row.debtor.fullName} />
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums text-xs text-fg">
                    {formatCop(row.amount)}
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums text-xs text-fg-muted">
                    {formatCop(row.feeCop)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Badge variant={providerBadgeVariant(row.provider)}>
                      {t(`inmobiliaria.ai.cobranza.pagos.filter.${row.provider}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadgeVariant(row.status)}>
                        {t(`inmobiliaria.ai.cobranza.pagos.status.${row.status}`)}
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

      {/* Sentinel + loadingMore spinner */}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center">
          {isLoadingMore && (
            <span className="text-xs text-fg-muted">
              {t('inmobiliaria.ai.cobranza.pagos.loadingMore')}
            </span>
          )}
        </div>
      )}
    </main>
  )
}
