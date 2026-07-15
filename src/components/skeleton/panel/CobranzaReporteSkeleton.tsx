'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { RowSkeleton } from '@/components/skeleton/panel/RowSkeleton'

/**
 * CobranzaReporteSkeleton — Phase 38 plan 38-04a (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cobranza/reporte`.
 * Mirrors ReporteViewerContent: header (title + date selector + action buttons) →
 * KPI tile row (3 cards) → alert banner stub → top-debtors section (5 RowSkeleton) →
 * history table section (5 RowSkeleton) → CSV export button stub.
 *
 * Used by ReporteViewerContent when `isLoading && !data`.
 */
export function CobranzaReporteSkeleton() {
  return (
    <div
      data-testid="cobranza-reporte-skeleton"
      className="p-4 md:p-6 space-y-6 animate-pulse"
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      </div>

      {/* KPI tile row — 3 cards (matches real KpiTile count) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card p-4 h-24 space-y-2"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Alert banner stub */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Top debtors section */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-muted/20">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-4 py-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* History table section + CSV export */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-muted/20 flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
        <div className="px-4 py-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
