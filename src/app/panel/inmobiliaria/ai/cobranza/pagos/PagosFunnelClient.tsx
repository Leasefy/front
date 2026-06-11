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

function chipClasses(active: boolean): string {
  return active
    ? 'bg-[#6B6B6B] text-white border-[#6B6B6B]'
    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-[#6B6B6B]'
}

function statusBadgeClasses(status: Status): string {
  switch (status) {
    case 'approved':
      return 'bg-[#2C7A53] text-[#2C7A53] ring-1 ring-[#2C7A53] dark:bg-[#2C7A53]/30 dark:text-[#2C7A53] dark:ring-[#2C7A53]'
    case 'pending':
      return 'bg-[#B7791F] text-[#B7791F] ring-1 ring-[#B7791F] dark:bg-[#B7791F]/30 dark:text-[#B7791F] dark:ring-[#B7791F]'
    case 'declined':
      return 'bg-[#C4503B] text-[#C4503B] ring-1 ring-[#C4503B] dark:bg-[#C4503B]/30 dark:text-[#C4503B] dark:ring-[#C4503B]'
    case 'disbursed':
      return 'bg-[#6B6B6B] text-[#6B6B6B] ring-1 ring-[#6B6B6B] dark:bg-[#6B6B6B]/30 dark:text-[#6B6B6B] dark:ring-[#6B6B6B]'
  }
}

function providerBadgeClasses(provider: Provider): string {
  return provider === 'wompi'
    ? 'bg-[#1A40FF] text-[#1A40FF] ring-1 ring-[#1A40FF] dark:bg-[#1A40FF]/30 dark:text-[#1A40FF] dark:ring-[#1A40FF]'
    : 'bg-[#6B6B6B] text-[#6B6B6B] ring-1 ring-[#6B6B6B] dark:bg-[#6B6B6B]/30 dark:text-[#6B6B6B] dark:ring-[#6B6B6B]'
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
      className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
    >
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      ) : (
        <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{value}</p>
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
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.pagos.title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
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
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.ai.cobranza.pagos.title')}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {t('inmobiliaria.ai.cobranza.pagos.subtitle')}
        </p>
      </header>

      {/* KPI strip */}
      {renderKpis(kpis)}

      {/* Date-window selector */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {DATE_WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setDateWindow(w)}
            aria-pressed={dateWindow === w}
            data-testid={`pagos-date-window-${w}`}
            className={
              'px-3 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(dateWindow === w)
            }
          >
            {t(`inmobiliaria.ai.cobranza.pagos.dateWindow.${w}`)}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3 mb-4">
        <fieldset>
          <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-2 inline">
            {t('inmobiliaria.ai.cobranza.pagos.filter.provider')}:
          </legend>
          <span className="inline-flex flex-wrap gap-2 align-middle">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleProvider(p)}
                aria-pressed={providers.includes(p)}
                data-testid={`pagos-provider-chip-${p}`}
                className={
                  'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                  chipClasses(providers.includes(p))
                }
              >
                {t(`inmobiliaria.ai.cobranza.pagos.filter.${p}`)}
              </button>
            ))}
          </span>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-2 inline">
            {t('inmobiliaria.ai.cobranza.pagos.filter.status')}:
          </legend>
          <span className="inline-flex flex-wrap gap-2 align-middle">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={statuses.includes(s)}
                data-testid={`pagos-status-chip-${s}`}
                className={
                  'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                  chipClasses(statuses.includes(s))
                }
              >
                {t(`inmobiliaria.ai.cobranza.pagos.status.${s}`)}
              </button>
            ))}
          </span>
        </fieldset>

        <button
          type="button"
          onClick={clearFilters}
          className="text-xs font-medium text-[#6B6B6B] dark:text-[#6B6B6B] hover:underline"
        >
          {t('inmobiliaria.ai.cobranza.pagos.filter.clear')}
        </button>
      </div>

      {/* Sort selector */}
      <div className="flex items-center gap-2 mb-4">
        <label
          htmlFor="pagos-sort"
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >
          Sort:
        </label>
        <select
          id="pagos-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as PaymentsFunnelSort)}
          data-testid="pagos-sort-select"
          className="text-xs px-2 py-1 rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200"
        >
          <option value="created_at">{t('inmobiliaria.ai.cobranza.pagos.sort.createdAt')}</option>
          <option value="amount">{t('inmobiliaria.ai.cobranza.pagos.sort.amountDesc')}</option>
          <option value="disbursement_pending_days">
            {t('inmobiliaria.ai.cobranza.pagos.sort.disbursementPendingDays')}
          </option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-[#C4503B] dark:border-[#C4503B] bg-[#C4503B] dark:bg-[#C4503B]/30 p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-[#C4503B] dark:text-[#C4503B]">
            {t('inmobiliaria.ai.cobranza.pagos.error')}: {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-medium px-3 py-1.5 rounded-sm bg-[#C4503B] text-white hover:bg-[#C4503B]"
          >
            {t('inmobiliaria.ai.cobranza.pagos.errorRetry')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-950/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.pagos.columns.nombre')}
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-[#6B6B6B]"
                onClick={() => setSort('amount')}
                data-testid="pagos-th-monto"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.monto')}
                {sort === 'amount' && <span className="ml-1">↓</span>}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.pagos.columns.fee')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.pagos.columns.provider')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.pagos.columns.status')}
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-[#6B6B6B]"
                onClick={() => setSort('created_at')}
                data-testid="pagos-th-fecha"
              >
                {t('inmobiliaria.ai.cobranza.pagos.columns.fecha')}
                {sort === 'created_at' && <span className="ml-1">↓</span>}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading && rows.length === 0 && (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`pagos-skel-${i}`} className="animate-pulse">
                  {Array.from({ length: 6 }, (_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('inmobiliaria.ai.cobranza.pagos.emptyFiltered')}
                  </p>
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const isPending = row.disbursementPendingDays >= 3
              return (
                <tr
                  key={row.id}
                  data-testid={`pagos-row-${row.id}`}
                  onClick={() => handleRowClick(row)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRowClick(row)
                  }}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6B6B6B]"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-900 dark:text-white">
                    <Mask field="cedula" value={row.debtor.fullName} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-900 dark:text-white">
                    {formatCop(row.amount)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {formatCop(row.feeCop)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                        providerBadgeClasses(row.provider)
                      }
                    >
                      {t(`inmobiliaria.ai.cobranza.pagos.filter.${row.provider}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                          statusBadgeClasses(row.status)
                        }
                      >
                        {t(`inmobiliaria.ai.cobranza.pagos.status.${row.status}`)}
                      </span>
                      {isPending && (
                        <span
                          data-testid={`pagos-pending-pill-${row.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#B7791F] text-[#B7791F] ring-1 ring-[#B7791F] dark:bg-[#B7791F]/40 dark:text-[#B7791F] dark:ring-[#B7791F]"
                        >
                          <span aria-hidden="true">⚠</span>
                          {t('inmobiliaria.ai.cobranza.pagos.pill.disbursementPending')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sentinel + loadingMore spinner */}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center">
          {isLoadingMore && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.ai.cobranza.pagos.loadingMore')}
            </span>
          )}
        </div>
      )}
    </main>
  )
}
