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
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
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
        <h1 className="text-h2 text-fg">
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
            <AlertaAccionable
              severidad="danger"
              titulo={t('inmobiliaria.ai.mantenimiento.inbox.errorLoading')}
              accion={{
                label: t('inmobiliaria.ai.cobranza.deudores.errorRetry'),
                onClick: () => void refetch(),
                icon: <ArrowClockwise size={14} weight="bold" />,
              }}
              className="mb-4"
            >
              {error}
            </AlertaAccionable>
          )}

          <InboxList
            tickets={data}
            isLoading={isLoading}
            hasActiveFilters={activeFilters}
            onSelect={(id) => router.push(`/panel/inmobiliaria/mantenimientos/tickets/${id}`)}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        </section>
      </div>
    </main>
  )
}
