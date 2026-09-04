'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { RowSkeleton } from '@/components/skeleton/panel/RowSkeleton'

/**
 * EstudiosListSkeleton — Tier-B estudio UX (build-kit §5).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/postulaciones/estudio/estudios`.
 * Mirrors EstudiosListClient: header → filter aside (chip rows + search) →
 * table header → 5 RowSkeleton rows. Mirrors CobranzaDeudoresListSkeleton.
 *
 * Used by EstudiosListClient when `isLoading && items.length === 0` (first load).
 */
export function EstudiosListSkeleton() {
  return (
    <main
      data-testid="estudios-list-skeleton"
      className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4 animate-pulse"
    >
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-60" />
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter aside (md+) — 4 result-type chips + 2 estado chips + search */}
        <aside className="md:w-64 space-y-5">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </aside>

        {/* Main content */}
        <section className="flex-1 min-w-0 space-y-4">
          {/* Search input */}
          <Skeleton className="h-10 w-full max-w-md rounded-md" />

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
        </section>
      </div>
    </main>
  )
}
