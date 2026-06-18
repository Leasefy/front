'use client'

// Phase 31 plan 31-10 — call transcript with timestamped click-to-seek + inline compliance pills.
//
// Click-to-seek wiring:
//   transcript timestamp click → onSeek(turn.startSec)
//   → CallDetailClient.seekTo → audioRef.current.currentTime = sec
//   → audio plays from new position.
//
// T-31-PII reminder: turn.text is pre-redacted by backend. Do NOT log it to
// console, Sentry, analytics, or any persistent store. Stays in React state only.

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/lib/i18n'
import {
  useCallTranscript,
  type TranscriptSpeaker,
} from '@/lib/hooks/cobranza/use-call-transcript'
import type { CallComplianceFlag } from '@/lib/hooks/cobranza/use-call-detail'
import CompliancePill from './CompliancePill'

interface CallTranscriptProps {
  callId: string
  onSeek: (sec: number) => void
  complianceFlags: CallComplianceFlag[]
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function speakerTone(speaker: TranscriptSpeaker): {
  label: 'speakerOperador' | 'speakerDeudor' | 'speakerBot'
  cls: string
} {
  switch (speaker) {
    case 'operador':
      return {
        label: 'speakerOperador',
        cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:bg-fg-muted/30 dark:text-neutral-600 dark:text-neutral-300',
      }
    case 'bot':
      return {
        label: 'speakerBot',
        cls: 'bg-warning-soft text-warning dark:bg-warning/30 dark:text-warning',
      }
    case 'deudor':
    default:
      return {
        label: 'speakerDeudor',
        cls: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      }
  }
}

export default function CallTranscript({
  callId,
  onSeek,
  complianceFlags,
}: CallTranscriptProps) {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useCallTranscript({ callId })

  // Build flag index once per change.
  const flagIndex = useMemo(() => {
    const m = new Map<string, CallComplianceFlag>()
    for (const f of complianceFlags) m.set(f.id, f)
    return m
  }, [complianceFlags])

  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.transcript.title')}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <header className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.cobranza.call.transcript.title')}
        </h2>
      </header>

      {isLoading && !data && (
        <div className="p-4 space-y-3" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"
            />
          ))}
          <p className="sr-only">
            {t('inmobiliaria.ai.cobranza.call.transcript.loading')}
          </p>
        </div>
      )}

      {error && !data && (
        <div className="p-4">
          <p className="text-sm text-danger">
            {t('inmobiliaria.ai.cobranza.call.transcript.error')}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch()
            }}
            className="mt-2 inline-flex items-center min-h-11 min-w-11 px-3 py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm"
          >
            {t('inmobiliaria.ai.cobranza.call.transcript.errorRetry')}
          </button>
        </div>
      )}

      {data && data.turns.length === 0 && (
        <p className="p-6 text-sm text-neutral-500 dark:text-neutral-400 text-center">
          {t('inmobiliaria.ai.cobranza.call.transcript.empty')}
        </p>
      )}

      {data && data.turns.length > 0 && (
        <ScrollArea className="max-h-[70vh] md:max-h-[calc(100vh-16rem)]">
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.turns.map((turn) => {
              const sp = speakerTone(turn.speaker)
              const flags = turn.complianceFlagIds
                .map((id) => flagIndex.get(id))
                .filter((f): f is CallComplianceFlag => Boolean(f))
              return (
                <li key={turn.id} className="px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sp.cls}`}
                    >
                      {t(`inmobiliaria.ai.cobranza.call.transcript.${sp.label}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSeek(turn.startSec)}
                      aria-label={t(
                        'inmobiliaria.ai.cobranza.call.transcript.seekAria',
                        { time: formatSec(turn.startSec) },
                      )}
                      className="inline-flex items-center justify-center min-h-11 min-w-11 px-2 py-1 rounded-sm text-xs tabular-nums text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-fg-muted/20 focus:outline-none focus:ring-2 focus:ring-fg-muted font-medium"
                    >
                      {formatSec(turn.startSec)}
                    </button>
                  </div>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {/* turn.text is pre-redacted server-side per T-31-PII;
                        rendered verbatim. Do NOT pass into analytics or loggers. */}
                    {turn.text}
                  </p>
                  {flags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {flags.map((flag) => (
                        <CompliancePill key={flag.id} flag={flag} />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      )}
    </section>
  )
}
