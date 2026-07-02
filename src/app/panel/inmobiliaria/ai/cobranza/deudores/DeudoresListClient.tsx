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
import { CobranzaImportCard } from '@/components/inmobiliaria/cobranza/CobranzaImportCard'
import { CobranzaDeudoresListSkeleton } from '@/components/skeleton/panel/CobranzaDeudoresListSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Input } from '@/components/ui'
import {
  Chip,
  Badge,
  RangeSlider,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@leasefy/cadence'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

void React

type Channel = 'voice' | 'whatsapp' | 'email'
const CHANNELS: Channel[] = ['voice', 'whatsapp', 'email']

const DAYS_MIN_DEFAULT = 0
const DAYS_MAX_DEFAULT = 90

// Tailwind tokens for days-in-stage badge — D-31 spec: green ≤3, amber 4-7, red ≥8
// (semantic status tints vía tokens del DS — contrato §8)
function daysBadgeVariant(days: number): 'success' | 'warning' | 'danger' {
  if (days <= 3) return 'success'
  if (days <= 7) return 'warning'
  return 'danger'
}

export default function DeudoresListClient() {
  const { t, locale } = useI18n()
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
      <main className="p-6 lg:p-8 space-y-4">
        <EmptyState
          icon={Users}
          title={t('inmobiliaria.ai.cobranza.deudores.empty.title')}
          description={t('inmobiliaria.ai.cobranza.deudores.empty.description')}
        />
        {/* Importar cartera — cableada al endpoint POST /cartera/import.
            FAIL-SOFT: si el backend no está desplegado (404/red), el card
            degrada a "Próximamente — requiere despliegue" sin romper. Tras un
            import exitoso refrescamos la lista para salir del empty state. */}
        <CobranzaImportCard onImported={() => void refetch()} />
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
            <Chip
              key={s}
              size="sm"
              selected={stages.includes(s)}
              onClick={() => toggleStage(s)}
              data-testid={`stage-chip-${s}`}
            >
              {s}
            </Chip>
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
            <Chip
              key={c}
              size="sm"
              selected={channels.includes(c)}
              onClick={() => toggleChannel(c)}
            >
              {t(`inmobiliaria.ai.cobranza.deudores.channels.${c}` as Parameters<typeof t>[0])}
            </Chip>
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
          <RangeSlider
            min={DAYS_MIN_DEFAULT}
            max={DAYS_MAX_DEFAULT}
            value={[daysMin, daysMax]}
            onValueChange={([lo, hi]) => {
              setDaysMin(lo)
              setDaysMax(hi)
            }}
            showLabels={false}
            aria-label="days-in-stage"
          />
        </div>
      </fieldset>

      <Button
        variant="link"
        size="sm"
        onClick={clearFilters}
        hideArrow
        className="px-0 h-auto"
      >
        {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
      </Button>
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
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => setFiltersDrawerOpen(true)}
          >
            {t('inmobiliaria.ai.cobranza.deudores.openFilters')}
          </Button>
        </div>

        {/* Mobile drawer → Cadence Sheet (bottom) */}
        <Sheet open={filtersDrawerOpen} onOpenChange={setFiltersDrawerOpen}>
          <SheetContent
            side="bottom"
            className="md:hidden max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-xl"
          >
            <SheetHeader>
              <SheetTitle>{t('inmobiliaria.ai.cobranza.deudores.filters.title')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FiltersPanel />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <section className="flex-1 min-w-0">
          {/* Search + sort label */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="debtor-search" className="sr-only">
                {t('inmobiliaria.ai.cobranza.deudores.filters.search.label')}
              </label>
              <Input
                id="debtor-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('inmobiliaria.ai.cobranza.deudores.filters.search.placeholder')}
              />
              {searchHint && (
                <p className="text-xs text-warning mt-1">{searchHint}</p>
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
            <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-danger">
                {t('inmobiliaria.ai.cobranza.deudores.error')}: {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => void refetch()}
                className="shrink-0"
              >
                {t('inmobiliaria.ai.cobranza.deudores.errorRetry')}
              </Button>
            </div>
          )}

          {/* md+ table */}
          <div className="hidden md:block overflow-x-auto overscroll-contain rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Table stickyHeader className="min-w-full text-sm">
              <TableHeader className="bg-neutral-50 dark:bg-neutral-950/50">
                <TableRow>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.name')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.stage')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.daysInStage')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.cedula')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.phone')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.email')}</TableHead>
                  <TableHead>{t('inmobiliaria.ai.cobranza.deudores.columns.channel')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && pages.length === 0 && (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`} className="animate-pulse">
                      {Array.from({ length: 7 }, (_, j) => (
                        <TableCell key={j} className="px-3 py-3">
                          <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
                {!isLoading && pages.length === 0 && !error && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-3 py-12 text-center">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                        {t('inmobiliaria.ai.cobranza.deudores.emptyFiltered')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        hideArrow
                        onClick={clearFilters}
                      >
                        {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {pages.map((d) => (
                  <TableRow
                    key={d.id}
                    onClick={() => navigateToDebtor(d.id)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigateToDebtor(d.id)
                    }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <TableCell className="px-3 py-2.5 text-neutral-900 dark:text-white whitespace-nowrap">
                      {d.fullName}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <span className="text-xs font-semibold text-foreground">
                        {d.currentStage}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Badge variant={daysBadgeVariant(d.daysInStage)}>
                        {d.daysInStage}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Mask field="cedula" value={d.cedulaMasked} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Mask field="phone" value={d.phoneMasked} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Mask field="email" value={d.emailMasked} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {d.channel}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* sm cards (mirrors LlamadasTab md+/sm pattern) */}
          <div className="md:hidden">
            {!isLoading && pages.length === 0 && !error ? (
              <div className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-12 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                  {t('inmobiliaria.ai.cobranza.deudores.emptyFiltered')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  onClick={clearFilters}
                >
                  {t('inmobiliaria.ai.cobranza.deudores.filters.clear')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {pages.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => navigateToDebtor(d.id)}
                      className="w-full min-h-11 text-left rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {d.fullName}
                        </p>
                        <span className="text-xs font-semibold text-foreground shrink-0">
                          {d.currentStage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={daysBadgeVariant(d.daysInStage)}>
                          {d.daysInStage} {t('inmobiliaria.ai.cobranza.deudores.columns.daysInStage')}
                        </Badge>
                        <Mask field="cedula" value={d.cedulaMasked} />
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                        {d.channel}
                        {d.lastActivityAt
                          ? ` · ${new Date(d.lastActivityAt).toLocaleDateString(locale)}`
                          : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
