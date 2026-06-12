'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * CotizadorWizardSkeleton — Phase 38 plan 38-04b (D-38-02 hybrid skeletons).
 *
 * Bespoke 1:1 layout placeholder for `/panel/inmobiliaria/ai/cotizador/nueva`.
 * Mirrors the wizard page composition:
 *   - Top header bar (h1 + subtitle)
 *   - 3-step WizardStepIndicator (circles + connectors)
 *   - max-w-lg form area with 5 field rows + Continuar button bar
 *
 * Used by NuevaCotizacionPage only during re-quote hydration:
 *   if (isReQuoteMode && parentMetadata.isLoading)
 *
 * The normal new-quote path always has immediate form state — no skeleton needed.
 * No EmptyState per D-38-04 wizard rule (form always has state).
 */
export function CotizadorWizardSkeleton() {
  return (
    <div
      data-testid="cotizador-wizard-skeleton"
      aria-busy="true"
      aria-label="Cargando wizard de cotización"
      className="min-h-screen bg-background animate-pulse"
    >
      {/* Header bar — mirrors the real <div className="border-b ..."> block */}
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* 3-step progress indicator — mirrors WizardStepIndicator: circles
          connected by short lines (step1 — connector — step2 — connector — step3) */}
      <div className="flex items-center justify-center gap-2 px-4 py-6">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-0.5 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-0.5 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Form fields area — mirrors the max-w-lg form card */}
      <div className="mx-auto max-w-lg px-4 sm:px-6 space-y-4 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}

        {/* Button bar — mirrors WizardStep1Candidato "Continuar" layout */}
        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
