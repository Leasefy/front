'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { RowSkeleton } from '@/components/skeleton/panel/RowSkeleton'

/**
 * CobranzaDeudoresListSkeleton — Phase 38 plan 38-04a (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cobranza/deudores`.
 * Mirrors the DeudoresListClient layout: header → filter bar (chip rows + search) →
 * table header → 5 RowSkeleton rows → pagination stub.
 *
 * Used by DeudoresListClient when `isLoading && pages.length === 0` (first load
 * only — re-filtering keeps the table mounted and reads `isLoadingMore`).
 */
export function CobranzaDeudoresListSkeleton() {
  return (
    <main
      data-testid="cobranza-deudores-list-skeleton"
      className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4 animate-pulse"
    >
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </header>

      {/* Filter bar — 3 stage chips + 1 channel chip + spacer + search input */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-56 rounded-lg" />
      </div>

      {/* Table header — 3-col flex */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>

      {/* 5 row skeletons */}
      {[0, 1, 2, 3, 4].map((i) => (
        <RowSkeleton key={i} />
      ))}

      {/* Pagination stub */}
      <div className="flex justify-between mt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </main>
  )
}
