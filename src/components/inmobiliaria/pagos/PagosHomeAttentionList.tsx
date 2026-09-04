'use client'

/**
 * PagosHomeAttentionList — Pagos IA Home, widget HOME-02.
 *
 * Prioritized list of payment cases that need attention. Items arrive
 * pre-sorted (alta → media → baja) from the agent; this component does NOT
 * re-sort. Each row shows a priority badge, title, detail, COP total, and an
 * action button labeled from `suggestedAction`. Selecting a row (whole row is
 * a button) calls `onSelect(item.id)` so the client can open the detail panel.
 *
 * Pure presentational: receives the attention payload + loading/error flags.
 * Empty state uses the shared EmptyState primitive.
 */

import { Bell, CaretRight } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/data-display/EmptyState'
import type {
  PagosHomeAttention,
  PagosHomeAttentionItem,
  PagosHomeAttentionPriority,
} from '@/lib/api/pagos-home.types'

const PRIORITY_BADGE_VARIANT: Record<
  PagosHomeAttentionPriority,
  'destructive' | 'warning' | 'secondary'
> = {
  alta: 'destructive',
  media: 'warning',
  baja: 'secondary',
}

export interface PagosHomeAttentionListProps {
  data: PagosHomeAttention | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (invoiceId: string) => void
  /** invoiceId currently shown in the detail panel (for active-row highlight). */
  selectedInvoiceId?: string | null
}

export function PagosHomeAttentionList({
  data,
  isLoading,
  error,
  onRetry,
  onSelect,
  selectedInvoiceId,
}: PagosHomeAttentionListProps) {
  const { t } = useI18n()

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">
          {t('inmobiliaria.ai.pagos_home.attention.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.ai.pagos_home.attention.subtitle')}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <AttentionSkeleton />
        ) : error && !isLoading ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4"
          >
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {t('inmobiliaria.ai.pagos_home.errors.loading')}: {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400 underline hover:no-underline"
            >
              {t('inmobiliaria.ai.pagos_home.errors.retry')}
            </button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t('inmobiliaria.ai.pagos_home.attention.empty.title')}
            description={t('inmobiliaria.ai.pagos_home.attention.empty.description')}
          />
        ) : (
          <ul className="space-y-2" data-testid="attention-list">
            {data.items.map((item) => (
              <AttentionRow
                key={item.id}
                item={item}
                onSelect={onSelect}
                active={selectedInvoiceId === item.id}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ── Single row ────────────────────────────────────────────────────────────────

function AttentionRow({
  item,
  onSelect,
  active,
}: {
  item: PagosHomeAttentionItem
  onSelect: (invoiceId: string) => void
  active: boolean
}) {
  const { t, formatCurrency } = useI18n()
  const priorityLabel = t(`inmobiliaria.ai.pagos_home.attention.priority.${item.priority}`)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        data-testid="attention-row"
        data-priority={item.priority}
        aria-label={`${item.title} — ${t('inmobiliaria.ai.pagos_home.attention.openDetail')}`}
        className={[
          'w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          active
            ? 'border-primary/40 bg-primary/5'
            : 'border-border hover:bg-muted/50',
        ].join(' ')}
      >
        <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={PRIORITY_BADGE_VARIANT[item.priority]}>{priorityLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {t(`inmobiliaria.ai.pagos_home.attention.kind.${item.kind}`)}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground truncate w-full">{item.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.detail}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(item.totalCop)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            {item.suggestedAction}
            <CaretRight className="w-3 h-3" aria-hidden="true" />
          </span>
        </div>
      </button>
    </li>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function AttentionSkeleton() {
  return (
    <ul className="space-y-2 animate-pulse" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          data-testid="attention-skeleton"
          className="rounded-lg border border-border p-3 flex items-start justify-between gap-3"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 w-16 rounded-full bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
          <div className="h-4 w-20 rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}
