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
import { Button } from '@/components/ui'
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
        cls: 'bg-surface-muted text-fg-muted',
      }
    case 'bot':
      return {
        label: 'speakerBot',
        cls: 'bg-warning-soft text-warning',
      }
    case 'deudor':
    default:
      return {
        label: 'speakerDeudor',
        cls: 'bg-surface-muted text-fg-muted',
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
      className="rounded-xl border border-border bg-surface"
    >
      <header className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-fg">
          {t('inmobiliaria.ai.cobranza.call.transcript.title')}
        </h2>
      </header>

      {isLoading && !data && (
        <div className="p-4 space-y-3" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded bg-surface-muted animate-pulse"
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            hideArrow
            onClick={() => {
              void refetch()
            }}
            className="mt-2"
          >
            {t('inmobiliaria.ai.cobranza.call.transcript.errorRetry')}
          </Button>
        </div>
      )}

      {data && data.turns.length === 0 && (
        <p className="p-6 text-sm text-fg-subtle text-center">
          {t('inmobiliaria.ai.cobranza.call.transcript.empty')}
        </p>
      )}

      {data && data.turns.length > 0 && (
        <ScrollArea className="max-h-[70vh] md:max-h-[calc(100vh-16rem)]">
          <ul className="divide-y divide-border-faint">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={() => onSeek(turn.startSec)}
                      aria-label={t(
                        'inmobiliaria.ai.cobranza.call.transcript.seekAria',
                        { time: formatSec(turn.startSec) },
                      )}
                      className="min-h-11 min-w-11 tabular-nums text-fg-muted"
                    >
                      {formatSec(turn.startSec)}
                    </Button>
                  </div>
                  <p className="text-sm text-fg leading-relaxed">
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
