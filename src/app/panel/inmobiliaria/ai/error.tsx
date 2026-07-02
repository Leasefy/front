'use client'

/**
 * /ai error boundary — belt-and-braces for the agent workspaces.
 *
 * Catches render-time crashes anywhere under /panel/inmobiliaria/ai (e.g. a
 * finite-map lookup on an unknown backend key) instead of white-screening the
 * whole panel. Styled like the workspace error banners (danger tint card) and offers
 * a Reintentar that calls Next's reset() to re-render the segment.
 */

import { ErrorState } from '@leasefy/cadence'

export default function AiWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6 lg:p-8" data-testid="ai-workspace-error">
      <ErrorState
        title="Algo salió mal en este workspace"
        message={
          error.digest ? `Ref: ${error.digest}` : 'Inténtalo de nuevo o vuelve al panel.'
        }
        retryLabel="Reintentar"
        onRetry={() => reset()}
      />
    </div>
  )
}
