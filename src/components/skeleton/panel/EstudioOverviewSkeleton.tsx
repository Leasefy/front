'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * EstudioOverviewSkeleton — Tier-B estudio UX (overview first-load placeholder).
 * Mirrors the bespoke overview layout: header + KPI strip + atención card +
 * pipeline grid + feed. Modeled on CobranzaOverviewSkeleton.
 */
export function EstudioOverviewSkeleton() {
  return (
    <main data-testid="estudio-overview-skeleton" className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      {/* Atención card */}
      <Skeleton className="h-24 w-full rounded-xl" />
      {/* Pipeline grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      {/* Feed */}
      <Skeleton className="h-56 w-full rounded-xl" />
    </main>
  )
}
