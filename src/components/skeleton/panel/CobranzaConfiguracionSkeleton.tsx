'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CobranzaConfiguracionSkeleton — Phase 38 plan 38-04b (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/cobros/cobranza/configuracion`.
 * Mirrors the 4 policy sections (Cadencia, Negociación, Escalación, Compliance) +
 * sticky save footer.
 *
 * Used by CobranzaConfiguracionPage when `isLoading && !configData`. Replaces the
 * local SkeletonCard composition with the canonical bespoke skeleton from the
 * src/components/skeleton/panel/ directory.
 *
 * NO EmptyState (D-38-04 config rule) — config pages always render DEFAULT_POLICY
 * defaults even when no custom config exists; the form is never "empty" from the
 * user's perspective.
 */
export function CobranzaConfiguracionSkeleton() {
  return (
    <main
      data-testid="cobranza-configuracion-skeleton"
      aria-busy="true"
      aria-label="Cargando configuración"
      className="p-4 md:p-6 space-y-6 pb-24 animate-pulse"
    >
      {/* Page heading — h1 + subtitle */}
      <div className="space-y-1 mb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 4 config section cards — identical to the real Cadencia/Negociación/
          Escalación/Compliance sections (rounded-lg border, p-6, header +
          divider + 2-col input grid). */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <div className="border-t border-neutral-100 dark:border-neutral-800" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      ))}

      {/* Sticky save footer placeholder — mirrors the real Cancel + Save bar */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-4 flex items-center justify-end gap-3">
        <Skeleton className="h-9 w-20 rounded-sm" />
        <Skeleton className="h-9 w-24 rounded-sm" />
      </div>
    </main>
  )
}
