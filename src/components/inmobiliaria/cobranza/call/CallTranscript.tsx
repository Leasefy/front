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
import { useI18n } from '@/lib/i18n'
import {
  useCallTranscript,
  type TranscriptSpeaker,
} from '@/lib/hooks/cobranza/use-call-transcript'
import type { CallComplianceEvent } from '@/lib/hooks/cobranza/use-call-detail'
import CompliancePill from './CompliancePill'

interface CallTranscriptProps {
  callId: string
  onSeek: (sec: number) => void
  complianceEvents: CallComplianceEvent[]
  /** Inicio de la llamada: los eventos traen hora absoluta. */
  callStartedAt: string
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Los tokens son los que emite `normalizeSpeaker` del agente:
 * `operator` (persona de la inmobiliaria), `agent` (el asistente) y
 * `customer` (el inquilino).
 *
 * Antes este switch esperaba `operador` / `bot` / `deudor`, que no existen en
 * ningún lado. Como ninguno casaba, TODOS los turnos caían al `default` y el
 * transcript rotulaba como «deudor» lo que en realidad dijo el agente — o sea
 * que atribuía al inquilino frases que nunca dijo, en la pantalla que sirve de
 * evidencia ante una queja.
 */
function speakerTone(speaker: TranscriptSpeaker): {
  label: 'speakerOperador' | 'speakerDeudor' | 'speakerBot'
  cls: string
} {
  switch (speaker) {
    case 'operator':
      return {
        label: 'speakerOperador',
        cls: 'bg-surface-muted text-fg-muted',
      }
    case 'agent':
      return {
        label: 'speakerBot',
        cls: 'bg-warning-soft text-warning',
      }
    case 'customer':
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
  complianceEvents,
  callStartedAt,
}: CallTranscriptProps) {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useCallTranscript({ callId })

  /**
   * Reparte los eventos de cumplimiento en el turno donde ocurrieron.
   *
   * El endpoint de transcripción manda `complianceFlags: []` por turno SIEMPRE
   * —está escrito así a propósito: no existe la columna por turno—, así que
   * antes esto no resaltaba nunca nada. Los eventos reales viven en
   * `compliance_events` con hora absoluta; con el inicio de la llamada se
   * convierten a segundos y caen en el turno que los contiene.
   *
   * Un evento fuera de rango (la ventana de consulta tiene ±1 min de holgura)
   * se ancla al turno más cercano hacia atrás; si es anterior al primer turno,
   * al primero. Nunca se descarta: una marca de cumplimiento que no se muestra
   * es peor que una mal ubicada.
   */
  const eventosPorTurno = useMemo(() => {
    const m = new Map<string, CallComplianceEvent[]>()
    const turns = data?.turns ?? []
    if (turns.length === 0 || complianceEvents.length === 0) return m
    const base = new Date(callStartedAt).getTime()
    if (!Number.isFinite(base)) return m

    for (const ev of complianceEvents) {
      const at = new Date(ev.at).getTime()
      if (!Number.isFinite(at)) continue
      const sec = (at - base) / 1000
      let destino = turns[0]
      for (const turn of turns) {
        if (turn.startSec <= sec) destino = turn
        else break
      }
      const previos = m.get(destino.id) ?? []
      previos.push(ev)
      m.set(destino.id, previos)
    }
    return m
  }, [complianceEvents, data?.turns, callStartedAt])

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

      {/*
        SIN scroll anidado a propósito.

        Antes esto vivía dentro de un `ScrollArea` con `max-h-[70vh]` que no
        scrolleaba: el `max-h` iba en la RAÍZ y el viewport de Radix es
        `h-full`. Un `height:100%` contra un padre que sólo tiene `max-height`
        no resuelve, así que el viewport crecía con el contenido y la raíz
        —que es `overflow-hidden`— lo recortaba. La transcripción quedaba
        cortada y no había forma de llegar al final.

        Además un scroll dentro de una página que ya scrollea obliga a adivinar
        qué contenedor tiene el foco, y choca con Lenis (ver `docs/DESIGN.md`).
        Como el reproductor es sticky, los controles quedan a la vista mientras
        la página scrollea normal.
      */}
      {data && data.turns.length > 0 && (
        <ul className="divide-y divide-border-faint">
          {data.turns.map((turn) => {
            const sp = speakerTone(turn.speaker)
            const flags = eventosPorTurno.get(turn.id) ?? []
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
      )}
    </section>
  )
}
