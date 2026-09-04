import * as React from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { RowSkeleton } from './RowSkeleton'

/**
 * WidgetSkeleton — Phase 38 plan 38-02 (D-38-02).
 *
 * Card-level placeholder used inside dashboards/details before the real widget
 * hydrates. Three variants cover the v2.1 AI-panel widget shapes:
 *
 *  - kpi   → small label + big number + trend tag (used on overview kpi strips)
 *  - table → title + 5 RowSkeleton rows (top-debtors, recent-quotes, etc.)
 *  - chart → title + tall body + 6 mini ticks (cobranza analitica, cotizador insights)
 */

export type WidgetSkeletonVariant = 'kpi' | 'table' | 'chart'

export type WidgetSkeletonProps = {
  variant: WidgetSkeletonVariant
}

export function WidgetSkeleton({ variant }: WidgetSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      {variant === 'kpi' ? <KpiVariant /> : null}
      {variant === 'table' ? <TableVariant /> : null}
      {variant === 'chart' ? <ChartVariant /> : null}
    </div>
  )
}

function KpiVariant() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

function TableVariant() {
  return (
    <div>
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function ChartVariant() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-64 w-full" />
      <div className="flex gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2 flex-1" />
        ))}
      </div>
    </div>
  )
}
