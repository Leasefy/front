'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CobranzaDeudorDetailSkeleton — Phase 38 plan 38-04a (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cobranza/deudores/[id]`.
 * Mirrors DebtorDetailClient: header card (avatar + name + stage row) → 5-tab pill row →
 * tab content area, with a sidebar next-action card on lg+ as a 2-col split.
 *
 * Used by DebtorDetailClient when `isLoading && !data`. Per D-38-04, detail/dynamic
 * routes get a skeleton only — no page-level EmptyState (404 path handles not-found).
 */
export function CobranzaDeudorDetailSkeleton() {
  return (
    <main
      data-testid="cobranza-deudor-detail-skeleton"
      className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse"
    >
      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Two-column grid: main + sidebar (collapses on sm) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* 5-tab pill row */}
          <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>

          {/* Tab content placeholder */}
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        {/* Sidebar next-action card */}
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </main>
  )
}
