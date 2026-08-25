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
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useDebtorTimeline } from '@/lib/hooks/cobranza/use-debtor-timeline'
import { relativeTime } from '@/lib/cartera'
import { Button } from '@/components/ui'

void React

interface TimelineTabProps {
  debtorId: string
  /** Bump from parent (Phase 31 plan 31-11 realtime) to force a refetch. */
  refetchKey?: number
}

const EVENT_ICON: Record<string, string> = {
  stage_transition: '⇄',
  call: '📞',
  payment: '✅',
  memo: '📝',
}

export function TimelineTab({ debtorId, refetchKey = 0 }: TimelineTabProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useDebtorTimeline({ debtorId })
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Realtime-driven refetch (D-31-18 single refetch per event).
  useEffect(() => {
    if (refetchKey > 0) void refetch()
  }, [refetchKey, refetch])

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-14 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.timeline.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.timeline.errorRetry')}
        </Button>
      </div>
    )
  }

  const events = data?.events ?? []
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
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
            className="rounded-sm border border-border bg-surface"
          >
            <button
              type="button"
              onClick={handleClick}
              className="w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              <span
                aria-hidden="true"
                className="text-base shrink-0 mt-0.5"
                title={ev.event_type}
              >
                {EVENT_ICON[ev.event_type] ?? '•'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">
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
                  className="block text-xs text-fg-muted mt-0.5"
                  title={new Date(ev.occurred_at).toLocaleString(locale)}
                >
                  {relativeTime(ev.occurred_at, locale)}
                </span>
              </span>
            </button>
            {isExpanded && ev.event_type === 'stage_transition' && (
              <div className="px-3 pb-3 pt-1 text-xs text-fg-muted border-t border-border font-mono">
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
