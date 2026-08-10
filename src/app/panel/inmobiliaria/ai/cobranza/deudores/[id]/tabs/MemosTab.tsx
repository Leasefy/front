'use client'

/**
 * MemosTab — Phase 31 plan 31-09.
 *
 * Read-only memo cards. Memo creation/edit deferred to future phase.
 */

import * as React from 'react'

import { useI18n } from '@/lib/i18n'
import { useDebtorMemos } from '@/lib/hooks/cobranza/use-debtor-memos'
import { Button } from '@/components/ui'

void React

interface MemosTabProps {
  debtorId: string
}

export function MemosTab({ debtorId }: MemosTabProps) {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useDebtorMemos({ debtorId })

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-20 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.memos.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.memos.errorRetry')}
        </Button>
      </div>
    )
  }

  const memos = data?.memos ?? []
  if (memos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.detail.memos.empty')}
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {memos.map((m) => (
        <li
          key={m.id}
          className="rounded-sm border border-border bg-surface p-3"
        >
          <p className="text-sm text-fg whitespace-pre-wrap">
            {m.body ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span>{new Date(m.created_at).toLocaleString(locale)}</span>
            {m.last_outcome && (
              <span className="px-1.5 py-0.5 rounded bg-surface-muted">
                {m.last_outcome}
              </span>
            )}
            {m.last_emotional_state && (
              <span className="px-1.5 py-0.5 rounded bg-surface-muted">
                {m.last_emotional_state}
              </span>
            )}
            {m.open_ptp_amount_cop != null && m.open_ptp_date && (
              <span className="px-1.5 py-0.5 rounded bg-surface-muted text-fg">
                PTP {m.open_ptp_amount_cop} · {m.open_ptp_date}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
