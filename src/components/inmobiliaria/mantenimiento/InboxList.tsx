'use client'

/**
 * InboxList.tsx — Phase 7 plan 07-03 (DASH-02)
 *
 * Presentational list of TicketCards. Sorts defensively by score DESC (the 07-01
 * hook already sorts, but the list re-sorts so it is correct regardless of source)
 * and covers the three render states:
 *   1. loading + nothing yet → skeleton grid
 *   2. empty WITH active filters → "no match" block + clear-filters button
 *   3. empty WITHOUT active filters → EmptyState (genuinely no tickets)
 *
 * Announces the result count in an aria-live region for screen readers.
 * Labels via i18n keys declared by 07-02 (canonical C7-03 tree).
 */

import { Wrench } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { MaintenanceTicketCard } from '@/lib/types/mantenimiento'
import { TicketCard } from './TicketCard'
import { sortByScoreDesc } from './inbox-filter'

interface InboxListProps {
  tickets: MaintenanceTicketCard[]
  isLoading: boolean
  hasActiveFilters: boolean
  onSelect: (id: string) => void
  onClearFilters: () => void
}

const SKELETON_COUNT = 5

export function InboxList({
  tickets,
  isLoading,
  hasActiveFilters,
  onSelect,
  onClearFilters,
}: InboxListProps) {
  const { t } = useI18n()
  const sorted = sortByScoreDesc(tickets)

  // 1. Loading and nothing rendered yet → skeletons.
  if (isLoading && sorted.length === 0) {
    return (
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        data-testid="inbox-skeleton"
        aria-busy="true"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={`skeleton-${i}`}
            className="rounded-[1px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 animate-pulse"
          >
            <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 2. Empty WITH active filters → "no match" + clear.
  if (!isLoading && sorted.length === 0 && hasActiveFilters) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 px-6 py-12 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
          {t('inmobiliaria.ai.mantenimiento.inbox.emptyFiltered')}
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          {t('inmobiliaria.ai.mantenimiento.filters.limpiar')}
        </button>
      </div>
    )
  }

  // 3. Empty WITHOUT active filters → genuinely no tickets.
  if (!isLoading && sorted.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title={t('inmobiliaria.ai.mantenimiento.inbox.empty')}
        description={t('inmobiliaria.ai.mantenimiento.inbox.subtitle')}
      />
    )
  }

  // Populated.
  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        {`${sorted.length} · ${t('inmobiliaria.ai.mantenimiento.inbox.sortedByScore')}`}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="inbox-list">
        {sorted.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
