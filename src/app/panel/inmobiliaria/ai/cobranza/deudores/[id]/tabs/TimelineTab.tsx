'use client'

/**
 * TimelineTab — Phase 31 plan 31-09.
 *
 * Chronological event list (stage_transition / call / payment / memo).
 * Click stage_transition expands {from, to, actor, reason}. Click call row
 * navigates to /cobranza/llamadas/[callId].
 *
 * NOTE: long histories (>200 events) — swap react-virtual in a later phase.
 */

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useDebtorTimeline } from '@/lib/hooks/cobranza/use-debtor-timeline'
import { relativeTime } from '@/lib/cartera'

void React

interface TimelineTabProps {
  debtorId: string
}

const EVENT_ICON: Record<string, string> = {
  stage_transition: '⇄',
  call: '📞',
  payment: '✅',
  memo: '📝',
}

export function TimelineTab({ debtorId }: TimelineTabProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useDebtorTimeline({ debtorId })
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex items-center justify-between">
        <p className="text-sm text-red-700 dark:text-red-400">
          {t('inmobiliaria.ai.cobranza.detail.timeline.error')}: {error}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          {t('inmobiliaria.ai.cobranza.detail.timeline.errorRetry')}
        </button>
      </div>
    )
  }

  const events = data?.events ?? []
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.timeline.empty')}
        </p>
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {events.map((ev, idx) => {
        const isExpanded = expandedIdx === idx
        const isClickableCall =
          ev.event_type === 'call' &&
          ev.payload &&
          typeof (ev.payload as { call_id?: string }).call_id === 'string'

        const handleClick = () => {
          if (ev.event_type === 'stage_transition') {
            setExpandedIdx(isExpanded ? null : idx)
            return
          }
          if (isClickableCall) {
            const callId = (ev.payload as { call_id?: string }).call_id
            if (callId) {
              router.push(`/panel/inmobiliaria/ai/cobranza/llamadas/${callId}`)
            }
          }
        }

        return (
          <li
            key={`${ev.event_type}-${ev.occurred_at}-${idx}`}
            className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <button
              type="button"
              onClick={handleClick}
              className="w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
            >
              <span
                aria-hidden="true"
                className="text-base shrink-0 mt-0.5"
                title={ev.event_type}
              >
                {EVENT_ICON[ev.event_type] ?? '•'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-neutral-900 dark:text-white">
                  {t(
                    `inmobiliaria.ai.cobranza.detail.timeline.event${
                      ev.event_type === 'stage_transition'
                        ? 'StageTransition'
                        : ev.event_type === 'call'
                          ? 'Call'
                          : ev.event_type === 'payment'
                            ? 'Payment'
                            : 'Memo'
                    }`,
                  )}
                </span>
                <span
                  className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5"
                  title={new Date(ev.occurred_at).toLocaleString(locale)}
                >
                  {relativeTime(ev.occurred_at, locale)}
                </span>
              </span>
            </button>
            {isExpanded && ev.event_type === 'stage_transition' && (
              <div className="px-3 pb-3 pt-1 text-xs text-neutral-600 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800 font-mono">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
