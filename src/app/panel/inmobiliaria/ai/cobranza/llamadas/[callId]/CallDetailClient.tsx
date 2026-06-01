'use client'

// Phase 31 plan 31-10 (COBR-UI-04) — call detail client orchestrator.
// Renders header + responsive grid: sticky-top audio on sm, side-by-side on md+.
// Audio player, transcript, and side panels wired in Tasks 2-4.

import { useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useCallDetail } from '@/lib/hooks/cobranza/use-call-detail'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import CallAudioPlayer from '@/components/inmobiliaria/cobranza/call/CallAudioPlayer'
import CallTranscript from '@/components/inmobiliaria/cobranza/call/CallTranscript'
import CallQAPanel from '@/components/inmobiliaria/cobranza/call/CallQAPanel'
import CallStateTracePanel from '@/components/inmobiliaria/cobranza/call/CallStateTracePanel'
import CallCostPanel from '@/components/inmobiliaria/cobranza/call/CallCostPanel'

interface CallDetailClientProps {
  callId: string
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function qaTone(score: number | null | undefined): {
  bg: string
  text: string
  ring: string
} {
  // Matches days-in-stage badge color rule from 31-08 for visual consistency.
  if (score == null) {
    return {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-300',
      ring: 'ring-neutral-200 dark:ring-neutral-700',
    }
  }
  if (score >= 0.8) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      ring: 'ring-emerald-200 dark:ring-emerald-800',
    }
  }
  if (score >= 0.6) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      ring: 'ring-amber-200 dark:ring-amber-800',
    }
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-200 dark:ring-red-800',
  }
}

export default function CallDetailClient({ callId }: CallDetailClientProps) {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''
  const { data, isLoading, error, refetch } = useCallDetail({ callId })

  // Audio element ref lives at the orchestrator level so transcript click-to-seek
  // can drive the same <audio> that CallAudioPlayer renders.
  const audioRef = useRef<HTMLAudioElement>(null)

  const seekTo = useCallback((sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec
      void audioRef.current.play().catch(() => {
        /* autoplay policy — swallow silently */
      })
    }
  }, [])

  const startedAtLabel = useMemo(() => {
    if (!data?.startedAt) return ''
    try {
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.startedAt))
    } catch {
      return data.startedAt
    }
  }, [data?.startedAt, locale])

  // -------- Loading skeleton (Phase 38-05a: PageSkeleton primitive, detail variant) --------
  if (isLoading && !data) return <PageSkeleton variant="detail" />


  // -------- Error --------
  if (error && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 max-w-xl">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {t('inmobiliaria.ai.cobranza.call.error')}
          </p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => {
              void refetch()
            }}
            className="mt-3 inline-flex items-center min-h-11 min-w-11 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
          >
            {t('inmobiliaria.ai.cobranza.call.errorRetry')}
          </button>
        </div>
      </main>
    )
  }

  // -------- Empty (no data) --------
  if (!data) {
    return (
      <main className="p-6 lg:p-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.call.empty')}
        </p>
      </main>
    )
  }

  const qa = qaTone(data.qa.overall)
  const overallPct =
    data.qa.overall == null ? null : Math.round(data.qa.overall * 100)

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href={`/panel/inmobiliaria/ai/cobranza/deudores/${data.debtorId}`}
          className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline min-h-11"
        >
          ← {t('inmobiliaria.ai.cobranza.call.back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              {data.debtorNameRedacted}
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex gap-1">
                <dt className="font-medium">
                  {t('inmobiliaria.ai.cobranza.call.header.startedAt')}:
                </dt>
                <dd>{startedAtLabel}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">
                  {t('inmobiliaria.ai.cobranza.call.header.duration')}:
                </dt>
                <dd>{formatSec(data.durationSec)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">
                  {t('inmobiliaria.ai.cobranza.call.header.outcome')}:
                </dt>
                <dd className="uppercase tracking-wide">{data.outcome}</dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${qa.bg} ${qa.text} ${qa.ring}`}
              aria-label={t('inmobiliaria.ai.cobranza.call.header.qaOverall')}
            >
              QA {overallPct == null ? '—' : `${overallPct}/100`}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-1 ring-neutral-200 dark:ring-neutral-700"
              aria-label={t('inmobiliaria.ai.cobranza.call.header.complianceCount')}
            >
              {data.complianceFlags.length}{' '}
              {t('inmobiliaria.ai.cobranza.call.header.complianceCount')}
            </span>
          </div>
        </div>
      </header>

      {/* Responsive grid: single column on sm; two columns on md+. */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_22rem] gap-6">
        {/* LEFT COLUMN: audio (sticky) + transcript */}
        <div className="space-y-4">
          {/* Audio player — sticky on both layouts. */}
          <div className="sticky top-0 z-20 md:top-20 bg-white dark:bg-neutral-950 -mx-6 px-6 md:mx-0 md:px-0 py-2">
            {data.hasRecording ? (
              <CallAudioPlayer
                callId={callId}
                agencyId={agencyId}
                hasRecording={data.hasRecording}
                audioRef={audioRef}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                {t('inmobiliaria.ai.cobranza.call.header.noRecording')}
              </div>
            )}
          </div>

          {/* Transcript */}
          <CallTranscript
            callId={callId}
            onSeek={seekTo}
            complianceFlags={data.complianceFlags}
          />
        </div>

        {/* RIGHT COLUMN: QA / state / cost */}
        <aside className="space-y-4">
          <CallQAPanel qa={data.qa} />
          <CallStateTracePanel stateTrace={data.stateTrace} />
          <CallCostPanel cost={data.cost} />
        </aside>
      </div>
    </main>
  )
}
