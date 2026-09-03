import * as React from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { RowSkeleton } from './RowSkeleton'

/**
 * PageSkeleton — Phase 38 plan 38-02 (D-38-02).
 *
 * Page-level placeholder used while a v2.1 AI-panel page hydrates. Four variants
 * cover the four panel page shapes:
 *
 *  - dashboard → header + 4 KPI cards + 2 chart cards (cobranza/cotizador overview)
 *  - list      → header + search + 5 RowSkeleton rows (deudores/pagos/audit lists)
 *  - wizard    → 3-step progress + 3 form fields + button bar (nueva-cotización)
 *  - detail    → main content column + sidebar (deudor / quote / call detail)
 *
 * Bespoke per-page skeletons cover the 10 critical pages (D-38-01); this primitive
 * covers the remaining 23 non-critical pages.
 */

export type PageSkeletonVariant = 'detail' | 'list' | 'wizard' | 'dashboard'

export type PageSkeletonProps = {
  variant: PageSkeletonVariant
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {variant === 'dashboard' ? <DashboardVariant /> : null}
      {variant === 'list' ? <ListVariant /> : null}
      {variant === 'wizard' ? <WizardVariant /> : null}
      {variant === 'detail' ? <DetailVariant /> : null}
    </div>
  )
}

function DashboardVariant() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            data-testid="kpi-card-skeleton"
            className="rounded-lg border p-6 space-y-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ListVariant() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </div>
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function WizardVariant() {
  return (
    <div data-testid="wizard-skeleton" className="max-w-2xl space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-2 flex-1 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div data-testid="wizard-buttons" className="flex justify-between pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}

function DetailVariant() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div data-testid="detail-main" className="lg:col-span-2 space-y-4">
        <Skeleton className="h-7 w-56 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div data-testid="detail-sidebar" className="lg:col-span-1 space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}
