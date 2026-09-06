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
import { Button } from '@/components/ui/button'
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
  /**
   * ¿La consulta falló? Entonces esta lista no dice nada.
   *
   * La página pinta el cartel del fallo arriba y después llamaba a esta lista
   * con `tickets = []`, que caía en el vacío «No hay tickets»: la pantalla
   * afirmaba «falló» y «no tenés nada» al mismo tiempo, y lo segundo es una
   * mentira tranquilizadora. Es el mismo orden que impone `EstadoDeDatos`
   * (carga → fallo → vacío → datos): el vacío va DESPUÉS del fallo, nunca al
   * lado.
   */
  error?: string | null
}

const SKELETON_COUNT = 5

export function InboxList({
  tickets,
  isLoading,
  hasActiveFilters,
  onSelect,
  onClearFilters,
  error = null,
}: InboxListProps) {
  const { t } = useI18n()
  const sorted = sortByScoreDesc(tickets)

  // Falló y no hay nada que mostrar: habla el cartel de arriba, no un vacío.
  if (error && sorted.length === 0) return null

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
            className="rounded-lg border border-border bg-surface p-4 animate-pulse"
          >
            <div className="h-4 w-3/4 rounded bg-surface-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-surface-muted" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-surface-muted" />
              <div className="h-5 w-20 rounded-full bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 2. Empty WITH active filters → "no match" + clear.
  if (!isLoading && sorted.length === 0 && hasActiveFilters) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-fg-muted mb-3">
          {t('inmobiliaria.ai.mantenimiento.inbox.emptyFiltered')}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
          {t('inmobiliaria.ai.mantenimiento.filters.limpiar')}
        </Button>
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
