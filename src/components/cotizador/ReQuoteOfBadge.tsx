'use client'

// Phase 33 plan 33-05 (D-33-11)
//
// Re-quote lineage badge. Renders a clickable subtitle on the quote detail
// page that links back to the parent quote when the current quote was
// created via the "Re-cotizar con cambios" flow (Plan 33-06 wizard pre-fill).
//
// Returns null when parentId is null/undefined — no DOM output, no aria
// placeholder, so the badge never adds visual noise for first-time quotes.

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export interface ReQuoteOfBadgeProps {
  parentId: string | null | undefined
}

export function ReQuoteOfBadge({ parentId }: ReQuoteOfBadgeProps): React.JSX.Element | null {
  const { t } = useI18n()

  if (parentId == null) return null

  const shortId = parentId.slice(0, 8)
  const label = t('inmobiliaria.ai.cotizador.detail.reQuoteOfBadge', { shortId })

  return (
    <Link
      href={`/panel/inmobiliaria/ai/cotizador/${parentId}`}
      data-testid="re-quote-of-badge"
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  )
}
