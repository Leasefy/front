'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CobranzaEscalacionesSkeleton — Phase 38 plan 38-04a (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cobranza/escalaciones`.
 * Mirrors the kanban layout: header (title + refresh) → 3 columns side-by-side
 * (sm stacked, md+ 3-col), each with a column header (label + count badge) and
 * 3 card placeholders.
 *
 * Used by EscalacionesContent when `isLoading && !data`.
 */
export function CobranzaEscalacionesSkeleton() {
  return (
    <div
      data-testid="cobranza-escalaciones-skeleton"
      className="p-4 md:p-6 space-y-6 animate-pulse"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* 3-column kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card/50 p-4 space-y-3"
          >
            {/* Column header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>

            {/* 3 card placeholders */}
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
