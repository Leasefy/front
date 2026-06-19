'use client'

/**
 * MemosTab — Phase 31 plan 31-09.
 *
 * Read-only memo cards. Memo creation/edit deferred to future phase.
 */

import * as React from 'react'

import { useI18n } from '@/lib/i18n'
import { useDebtorMemos } from '@/lib/hooks/cobranza/use-debtor-memos'

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
            className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-[#C4503B] dark:border-[#C4503B] bg-[#C4503B] dark:bg-[#C4503B]/30 p-4 flex items-center justify-between">
        <p className="text-sm text-[#C4503B] dark:text-[#C4503B]">
          {t('inmobiliaria.ai.cobranza.detail.memos.error')}: {error}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm font-medium px-3 py-1.5 rounded-sm bg-[#C4503B] text-white hover:bg-[#C4503B]"
        >
          {t('inmobiliaria.ai.cobranza.detail.memos.errorRetry')}
        </button>
      </div>
    )
  }

  const memos = data?.memos ?? []
  if (memos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          className="rounded-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
        >
          <p className="text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
            {m.body ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{new Date(m.created_at).toLocaleString(locale)}</span>
            {m.last_outcome && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                {m.last_outcome}
              </span>
            )}
            {m.last_emotional_state && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                {m.last_emotional_state}
              </span>
            )}
            {m.open_ptp_amount_cop != null && m.open_ptp_date && (
              <span className="px-1.5 py-0.5 rounded bg-[#6B6B6B] dark:bg-[#6B6B6B]/30 text-[#6B6B6B] dark:text-[#6B6B6B]">
                PTP {m.open_ptp_amount_cop} · {m.open_ptp_date}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
