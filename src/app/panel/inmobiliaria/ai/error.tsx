'use client'

/**
 * /ai error boundary — belt-and-braces for the agent workspaces.
 *
 * Catches render-time crashes anywhere under /panel/inmobiliaria/ai (e.g. a
 * finite-map lookup on an unknown backend key) instead of white-screening the
 * whole panel. Styled like the workspace error banners (danger tint card) and offers
 * a Reintentar that calls Next's reset() to re-render the segment.
 */

import { WarningCircle } from '@phosphor-icons/react'

export default function AiWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6 lg:p-8" data-testid="ai-workspace-error">
      <div
        role="alert"
        className="rounded-xl border border-danger/30 bg-danger-soft p-8 text-center"
      >
        <WarningCircle
          className="w-8 h-8 mx-auto text-danger mb-2"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-danger">
          Algo salió mal en este workspace
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {error.digest ? `Ref: ${error.digest}` : 'Inténtalo de nuevo o vuelve al panel.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
