'use client'

/**
 * tickets/page.tsx — Phase 7 plan 07-03 (DASH-02)
 *
 * Prioritized maintenance inbox page. Orchestrates the controlled filter panel
 * (InboxFilters) and the list (InboxList), driven by useMantenimientoInbox (07-01).
 *
 * MOCK-FIRST: this page never fetches directly — all data flows through the hook,
 * which internally branches mock vs real via the config seam. No backend call here.
 *
 * FILTERING: the 07-01 hook ALREADY applies `filters` AND sorts by score DESC
 * internally (see use-mantenimiento-inbox.ts: applyFilters + .sort). So we pass
 * `filters` to the hook and consume `data` as-is — we do NOT re-filter in the page.
 * InboxList re-sorts defensively. `hasActiveFilters` (from inbox-filter.ts) only
 * decides which empty-state to show.
 *
 * The permission gate + breadcrumb are provided by ai/mantenimiento/layout.tsx (07-02).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useMantenimientoInbox } from '@/lib/hooks/mantenimiento/use-mantenimiento-inbox'
import type { InboxFilters as InboxFiltersType } from '@/lib/types/mantenimiento'
import { InboxFilters } from '@/components/inmobiliaria/mantenimiento/InboxFilters'
import { InboxList } from '@/components/inmobiliaria/mantenimiento/InboxList'
import { EMPTY_FILTERS, hasActiveFilters } from '@/components/inmobiliaria/mantenimiento/inbox-filter'

export default function MantenimientoTicketsPage() {
  const { t } = useI18n()
  const router = useRouter()

  const [filters, setFilters] = useState<InboxFiltersType>(EMPTY_FILTERS)

  // Hook applies the filters + sorts by score DESC internally; `data` is never null.
  const { data, isLoading, error, refetch } = useMantenimientoInbox(filters)

  const activeFilters = hasActiveFilters(filters)

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.ai.mantenimiento.inbox.title')}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {t('inmobiliaria.ai.mantenimiento.inbox.subtitle')}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters — sidebar on md+, stacked on sm */}
        <aside className="md:w-72 md:shrink-0 md:sticky md:top-4 md:self-start">
          <InboxFilters value={filters} onChange={setFilters} />
        </aside>

        {/* List + error */}
        <section className="flex-1 min-w-0">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 mb-4 flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-400">
                {t('inmobiliaria.ai.mantenimiento.inbox.errorLoading')}: {error}
              </p>
              {/* C7-03 declares no `inbox.errorRetry` key (reported as a gap). Icon-only
                  retry with an aria-label sourced from the existing cobranza retry key. */}
              <button
                type="button"
                onClick={() => void refetch()}
                aria-label={t('inmobiliaria.ai.cobranza.deudores.errorRetry')}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                <ArrowClockwise size={14} weight="bold" />
              </button>
            </div>
          )}

          <InboxList
            tickets={data}
            isLoading={isLoading}
            hasActiveFilters={activeFilters}
            onSelect={(id) => router.push(`/panel/inmobiliaria/ai/mantenimiento/tickets/${id}`)}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        </section>
      </div>
    </main>
  )
}
