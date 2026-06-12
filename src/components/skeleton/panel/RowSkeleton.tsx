import * as React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * RowSkeleton — Phase 38 plan 38-02 (D-38-02).
 *
 * Single 3-column table row skeleton used inside:
 *  - PageSkeleton variant="list"
 *  - WidgetSkeleton variant="table"
 *
 * Column widths are tweakable via Tailwind class props so a deudores/pagos/audit
 * list can match its real-data column proportions and avoid layout jump.
 *
 * `data-testid="row-skeleton"` is present so consumers (and vitest specs) can
 * count rows without depending on @testing-library/react matchers.
 */

export type RowSkeletonProps = {
  col1Width?: string
  col2Width?: string
  col3Width?: string
}

export function RowSkeleton({
  col1Width = 'w-32',
  col2Width = 'w-24',
  col3Width = 'w-16',
}: RowSkeletonProps) {
  return (
    <div
      data-testid="row-skeleton"
      className="flex items-center justify-between py-3.5 border-b border-neutral-200 dark:border-neutral-800 last:border-0"
    >
      <Skeleton className={`h-4 ${col1Width}`} />
      <Skeleton className={`h-4 ${col2Width}`} />
      <Skeleton className={`h-5 ${col3Width} rounded-full`} />
    </div>
  )
}
