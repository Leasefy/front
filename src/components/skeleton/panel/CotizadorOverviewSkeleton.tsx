'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CotizadorOverviewSkeleton — Phase 38 plan 38-04b (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/postulaciones/asegurabilidad`. Mirrors
 * the real overview page composition: header → 4-KPI strip → recent quotes feed
 * (table-like list) → carriers status strip (3-card grid).
 *
 * Used by CotizadorOverviewPage when `isLoading && !data`. Renders only the
 * structural placeholders so there is zero layout jump when the real widgets
 * mount (operators visit this page hourly per D-38-01).
 */
export function CotizadorOverviewSkeleton() {
  return (
    <main
      data-testid="cotizador-overview-skeleton"
      aria-busy="true"
      aria-label="Cargando cotizador"
      className="p-6 lg:p-8 space-y-6 animate-pulse"
    >
      {/* Header — title + subtitle + right-side CTA placeholder */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </header>

      {/* KPI strip — 2 cols sm / 4 cols lg, matches CotizadorKpiStrip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Recent quotes feed — heading + 5-row table-like list */}
      <section aria-label="Cotizaciones recientes" className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Carriers status — heading + 3-card grid */}
      <section aria-label="Estado de aseguradoras" className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
