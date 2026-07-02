'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * EstudioDetailSkeleton — Tier-B estudio UX.
 *
 * Bespoke 3-zone layout placeholder for
 * `/panel/inmobiliaria/ai/estudio/[id]`. Mirrors EstudioDetailClient:
 *   IZQUIERDA  → contexto sidebar card
 *   CENTRO     → eyebrow + tab pill row + tab content area
 *   DERECHA    → recomendación rail (next-action + quick-actions cards)
 *
 * Used by EstudioDetailClient while `isLoading && status === null`. Per the
 * detail/dynamic-route convention, detail pages get a skeleton only — the
 * notAvailable (404) path renders the friendly EmptyState instead.
 */
export function EstudioDetailSkeleton() {
  return (
    <main
      data-testid="estudio-detail-skeleton"
      className="p-4 lg:p-8 max-w-7xl mx-auto pb-8 animate-pulse"
    >
      {/* Breadcrumb + header */}
      <div className="mb-5 space-y-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* 3-zone grid */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[320px_minmax(0,1fr)_320px] lg:items-start">
        {/* IZQUIERDA — contexto */}
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* CENTRO — tabs */}
        <div className="min-w-0 space-y-4">
          <Skeleton className="h-3 w-24" />
          {/* tab pill row */}
          <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          {/* tab content placeholder */}
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>

        {/* DERECHA — recomendación */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </main>
  )
}
