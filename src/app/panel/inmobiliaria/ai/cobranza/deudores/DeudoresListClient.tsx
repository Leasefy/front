'use client'

/**
 * DeudoresListClient — Phase 31 plan 31-08 (COBR-UI-02).
 *
 * Implements:
 *  - D-31-13 multi-select stage + channel chips, days-in-stage range, search
 *  - D-31-14 default sort label "Más estancados primero" (server enforces)
 *  - D-31-15 cursor-based infinite scroll via IntersectionObserver
 *  - D-31-08 mask rendering for all PII at list level
 *  - ?stage=S3 / ?stage=S2,S3 querystring prefill
 *  - sm: filters in bottom drawer; md+: filters in left sidebar
 *
 * Does NOT wire the PIIRevealModal — that lands in 31-10.
 * Does NOT render raw cédula / phone / email anywhere.
 */

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { CARTERA_STAGES, type CarteraStage } from '@/lib/cartera'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'
import { hashCedulaPrefix } from '@/lib/cobranza/hash-cedula-prefix'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { CobranzaDeudoresListSkeleton } from '@/components/skeleton/panel/CobranzaDeudoresListSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

void React

type Channel = 'voice' | 'whatsapp' | 'email'
const CHANNELS: Channel[] = ['voice', 'whatsapp', 'email']

const DAYS_MIN_DEFAULT = 0
const DAYS_MAX_DEFAULT = 90

// Tailwind tokens for days-in-stage badge — D-31 spec: green ≤3, amber 4-7, red ≥8
function daysBadgeClasses(days: number): string {
  if (days <= 3) {
    return 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800'
  }
  if (days <= 7) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'
  }
  return 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800'
}

function stageChipClasses(active: boolean): string {
  return active
    ? 'bg-violet-600 text-white border-violet-600'
    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-violet-400'
}

export default function DeudoresListClient() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Filter state ──────────────────────────────────────────────────────────
  const initialStages = useMemo<CarteraStage[]>(() => {
    const raw = searchParams.get('stage')
    if (!raw) return []
    const allowed = new Set<string>(CARTERA_STAGES)
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => allowed.has(s)) as CarteraStage[]
  }, [searchParams])

  const [stages, setStages] = useState<CarteraStage[]>(initialStages)
  const [channels, setChannels] = useState<Channel[]>([])
  const [daysMin, setDaysMin] = useState<number>(DAYS_MIN_DEFAULT)
  const [daysMax, setDaysMax] = useState<number>(DAYS_MAX_DEFAULT)
  const [searchInput, setSearchInput] = useState<string>('')
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState<boolean>(false)

  // ── Debounced + hash-aware search value sent to the hook ──────────────────
  const [searchPayload, setSearchPayload] = useState<string>('')
  const [searchHint, setSearchHint] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSearchHint(null)
      const id = setTimeout(() => setSearchPayload(''), 250)
      return () => clearTimeout(id)
    }
    // Numeric-only path
    if (/^\d+$/.test(trimmed)) {
      if (trimmed.length < 4) {
        setSearchHint(t('inmobiliaria.ai.cobranza.deudores.searchMinChars'))
        return
      }
      setSearchHint(null)
      const id = setTimeout(async () => {
        try {
          const hex = await hashCedulaPrefix(trimmed)
          setSearchPayload(`HEX:${hex}`)
        } catch {
          setSearchPayload('')
        }
      }, 250)
      return () => clearTimeout(id)
    }
    // Name path
    setSearchHint(null)
    const id = setTimeout(() => setSearchPayload(trimmed), 250)
    return () => clearTimeout(id)
  }, [searchInput, t])

  // ── Build hook filters ────────────────────────────────────────────────────
  const filters = useMemo(
    () => ({
      stage: stages.length > 0 ? stages.join(',') : undefined,
      channel: channels.length > 0 ? channels.join(',') : undefined,
      daysMin: daysMin > DAYS_MIN_DEFAULT ? daysMin : undefined,
      daysMax: daysMax < DAYS_MAX_DEFAULT ? daysMax : undefined,
      search: searchPayload || undefined,
    }),
    [stages, channels, daysMin, daysMax, searchPayload],
  )

  const { pages, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    useDebtorList(filters)

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─────────
  // hasActiveFilters distinguishes "filtered empty" (Sin deudores con estos filtros)
  // from zero-portfolio (Aún no hay deudores → CTA to import). The page-level
  // EmptyState only fires when no filters are active and the list is genuinely empty.
  const hasActiveFilters =
    stages.length > 0 ||
    channels.length > 0 ||
    daysMin !== DAYS_MIN_DEFAULT ||
    daysMax !== DAYS_MAX_DEFAULT ||
    searchPayload.length > 0

  // ── Infinite scroll sentinel — hooks MUST run before any early return (Rules of Hooks) ──
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
  }, [hasMore, loadMore, pages.length])

  if (isLoading && pages.length === 0) return <CobranzaDeudoresListSkeleton />

  if (
    !isLoading &&
    !hasActiveFilters &&
    pages.length === 0 &&
    !error
  ) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Users}
          title={t('inmobiliaria.ai.cobranza.deudores.empty.title')}
          description={t('inmobiliaria.ai.cobranza.deudores.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cobranza.deudores.empty.cta.label'),
            href: '/panel/inmobiliaria/ai/cobranza/configuracion',
          }}
        />
      </main>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleStage = (s: CarteraStage) => {
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }
  const toggleChannel = (c: Channel) => {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }
  const clearFilters = () => {
    setStages([])
    setChannels([])
    setDaysMin(DAYS_MIN_DEFAULT)
    setDaysMax(DAYS_MAX_DEFAULT)
    setSearchInput('')
    setSearchPayload('')
  }
  const navigateToDebtor = (id: string) => {
    router.push(`/panel/inmobiliaria/ai/cobranza/deudores/${id}`)
  }

  // ── Sub-renderers ─────────────────────────────────────────────────────────
  const FiltersPanel = () => (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
        {t('inmobiliaria.ai.cobranza.deudores.filters.title')}
      </h2>

      {/* Stage chips */}
      <fieldset>
        <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
          {t('inmobiliaria.ai.cobranza.deudores.filters.stage')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CARTERA_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStage(s)}
              aria-pressed={stages.includes(s)}
              data-testid={`stage-chip-${s}`}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                stageChipClasses(stages.includes(s))
              }
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Channel chips */}
      <fieldset>
        <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
          {t('inmobiliaria.ai.cobranza.deudores.filters.channel')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleChannel(c)}
              aria-pressed={channels.includes(c)}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                (channels.includes(c)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-violet-400')
              }
            >
              {t(`inmobiliaria.ai.cobranza.deudores.channels.${c}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Days-in-stage range */}
      <fieldset>
        <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
          {t('inmobiliaria.ai.cobranza.deudores.filters.daysInStage')}
        </legend>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{daysMin}</span>
            <span>—</span>
            <span>{daysMax}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="range"
              min={DAYS_MIN_DEFAULT}
              max={DAYS_MAX_DEFAULT}
              value={daysMin}
              onChange={(e) => setDaysMin(Math.min(Number(e.target.value), daysMax))}
              className="flex-1"
              aria-label="days-min"
            />
            <input
              type="range"
              min={DAYS_MIN_DEFAULT}
              max={DAYS_MAX_DEFAULT}
              value={daysMax}
              onChange={(e) => setDaysMax(Math.max(Number(e.target.value), daysMin))}
              className="flex-1"
              aria-label="days-max"
            />
          </div>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={clearFilters}
        className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
      >
        {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
      </button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.ai.cobranza.deudores.title')}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {t('inmobiliaria.ai.cobranza.deudores.subtitle')}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar (md+) */}
        <aside className="hidden md:block md:w-64 md:sticky md:top-4 md:self-start">
          <FiltersPanel />
        </aside>

        {/* Mobile filter toggle (sm) */}
        <div className="md:hidden flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            data-testid="sort-label-mobile"
          >
            {t('inmobiliaria.ai.cobranza.deudores.sort.daysInStageDesc')}
          </span>
          <button
            type="button"
            onClick={() => setFiltersDrawerOpen(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200"
          >
            {t('inmobiliaria.ai.cobranza.deudores.openFilters')}
          </button>
        </div>

        {/* Mobile drawer */}
        {filtersDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label={t('inmobiliaria.ai.cobranza.deudores.closeFilters')}
              onClick={() => setFiltersDrawerOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="relative w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {t('inmobiliaria.ai.cobranza.deudores.filters.title')}
                </h2>
                <button
                  type="button"
                  onClick={() => setFiltersDrawerOpen(false)}
                  className="text-sm text-neutral-500"
                >
                  {t('inmobiliaria.ai.cobranza.deudores.closeFilters')}
                </button>
              </div>
              <FiltersPanel />
            </div>
          </div>
        )}

        {/* Main content */}
        <section className="flex-1 min-w-0">
          {/* Search + sort label */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="debtor-search" className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.search.label')}
              </label>
              <input
                id="debtor-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('inmobiliaria.ai.cobranza.deudores.filters.search.placeholder')}
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchHint && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{searchHint}</p>
              )}
            </div>
            <span
              className="hidden md:inline text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
              data-testid="sort-label"
            >
              {t('inmobiliaria.ai.cobranza.deudores.sort.daysInStageDesc')}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 mb-4 flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-400">
                {t('inmobiliaria.ai.cobranza.deudores.error')}: {error}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                {t('inmobiliaria.ai.cobranza.deudores.errorRetry')}
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.name')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.stage')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.daysInStage')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.cedula')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.phone')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.email')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('inmobiliaria.ai.cobranza.deudores.columns.channel')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {isLoading && pages.length === 0 && (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      {Array.from({ length: 7 }, (_, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!isLoading && pages.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                        {t('inmobiliaria.ai.cobranza.deudores.emptyFiltered')}
                      </p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
                      </button>
                    </td>
                  </tr>
                )}
                {pages.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigateToDebtor(d.id)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigateToDebtor(d.id)
                    }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <td className="px-3 py-2 text-neutral-900 dark:text-white whitespace-nowrap">
                      {d.fullName}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {d.currentStage}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                          daysBadgeClasses(d.daysInStage)
                        }
                      >
                        {d.daysInStage}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Mask field="cedula" value={d.cedulaMasked} />
                    </td>
                    <td className="px-3 py-2">
                      <Mask field="phone" value={d.phoneMasked} />
                    </td>
                    <td className="px-3 py-2">
                      <Mask field="email" value={d.emailMasked} />
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {d.channel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sentinel + loadingMore spinner */}
          {hasMore && (
            <div ref={sentinelRef} className="py-6 flex items-center justify-center">
              {isLoadingMore && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('inmobiliaria.ai.cobranza.deudores.loadingMore')}
                </span>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
