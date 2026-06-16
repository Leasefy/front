'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CotizadorQuoteDetailSkeleton — Phase 38 plan 38-04b (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/asegurabilidad/[quoteId]`.
 * Mirrors the streaming detail page composition:
 *   - Sticky <QuoteHeader> bar (title + meta + cost + connection dot)
 *   - max-w-6xl content area with quote header card, action row, 3 carrier
 *     cards (CarrierStreamGrid), and live cost ticker.
 *
 * Used by QuoteDetailContent while SSE is still establishing:
 *   if (carriers.length === 0 && !isConnected && !error)
 *
 * This is the FIRST real loading state for this page — RESEARCH Topic 9
 * confirmed the previous count=1 was superficial. NO EmptyState (D-38-04
 * dynamic-route rule: 404 path handles not-found).
 */
export function CotizadorQuoteDetailSkeleton() {
  return (
    <div
      data-testid="cotizador-quote-detail-skeleton"
      aria-busy="true"
      aria-label="Cargando cotización"
      className="flex flex-col min-h-screen animate-pulse"
    >
      {/* Sticky header — mirrors QuoteHeader sticky bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 sm:px-6 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Content area — max-w-6xl mirrors real page main */}
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Quote header card */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>

        {/* 3 carrier card placeholders — mirrors CarrierStreamGrid 3-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>

        {/* Live cost ticker placeholder */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}
