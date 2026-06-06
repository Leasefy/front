'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CobranzaOverviewSkeleton — Phase 38 plan 38-04a (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cobranza`. Mirrors
 * the real overview page composition: header → 4-KPI strip → 7-stage grid →
 * funnel chart → transitions feed (3 col) + next-actions panel (2 col).
 *
 * Used by `CobranzaOverviewPage` when `isLoading && !data`. Renders only the
 * structural placeholders so there is zero layout jump when the real widgets
 * mount (operators visit this page hourly per D-38-01).
 */
export function CobranzaOverviewSkeleton() {
  return (
    <main
      data-testid="cobranza-overview-skeleton"
      className="p-6 lg:p-8 space-y-6 animate-pulse"
    >
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </header>

      {/* KPI strip — 2 cols sm / 4 cols lg, matches CobranzaKpiStrip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 h-24 space-y-2"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Stages grid */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>

      {/* Funnel chart */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </section>

      {/* Transitions feed (3 col) + next-actions panel (2 col) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Skeleton className="h-56 w-full rounded-xl md:col-span-3" />
        <Skeleton className="h-40 w-full rounded-xl md:col-span-2" />
      </div>
    </main>
  )
}
