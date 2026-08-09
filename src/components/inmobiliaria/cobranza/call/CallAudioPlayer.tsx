'use client'

// Phase 31 plan 31-10 (COBR-UI-04) — call audio player.
// Native <audio> consuming the range-byte proxy from Plan 31-05.
// Browser handles Range/206 negotiation automatically; DO NOT add MediaSource.

import { useEffect, type KeyboardEvent } from 'react'
import { IconButton, SegmentedControl } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import {
  ALLOWED_SPEEDS,
  useAudioPlayer,
  type PlaybackSpeed,
} from '@/lib/hooks/cobranza/use-audio-player'
import { useCallRecording } from '@/lib/hooks/cobranza/use-call-recording'

interface CallAudioPlayerProps {
  callId: string
  agencyId: string
  /** Shared ref so transcript click-to-seek drives the same element. */
  audioRef: React.RefObject<HTMLAudioElement>
}

/** Marco común: el hueco del reproductor mantiene la misma forma haya audio o
 *  no, para que la ausencia no se lea como una pantalla rota. */
function PlayerSlot({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      {children}
    </div>
  )
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CallAudioPlayer({
  callId,
  agencyId,
  audioRef,
}: CallAudioPlayerProps) {
  const { t } = useI18n()
  const { currentTime, duration, isPlaying, speed, setSpeed, seekTo, togglePlay } =
    useAudioPlayer(audioRef)

  // El endpoint de audio es Bearer-only: un `<audio src>` nativo no puede
  // mandar el header Authorization, así que se piden los bytes y se alimenta un
  // object URL. El hook además pregunta si existe en vez de creerle a la
  // columna en base — ver `use-call-recording.ts`.
  const { state, retry } = useCallRecording(agencyId, callId)

  // Reset transient state when callId changes.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }, [callId, audioRef])

  if (state.status === 'probing') {
    return (
      <PlayerSlot>
        <p className="text-sm text-fg-muted" role="status">
          {t('inmobiliaria.ai.cobranza.call.player.probing')}
        </p>
      </PlayerSlot>
    )
  }

  if (state.status === 'absent') {
    // No es un error: hay llamadas sin audio (grabación deshabilitada, purgada
    // por retención, o canal sin voz). Se dice por qué la transcripción sí está.
    return (
      <PlayerSlot>
        <p className="text-sm text-fg">
          {t('inmobiliaria.ai.cobranza.call.player.absent')}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          {t('inmobiliaria.ai.cobranza.call.player.absentHint')}
        </p>
      </PlayerSlot>
    )
  }

  if (state.status === 'failed') {
    // Falló traerla ≠ no existe. Decir «no hay grabación» acá sería mentir
    // sobre la evidencia de una llamada.
    return (
      <PlayerSlot>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-danger" role="status">
            {t('inmobiliaria.ai.cobranza.call.player.failed')}
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-border px-3 py-1 text-xs text-fg hover:bg-surface-muted"
          >
            {t('inmobiliaria.ai.cobranza.call.player.retry')}
          </button>
        </div>
      </PlayerSlot>
    )
  }

  const objectUrl = state.objectUrl
  const esDemo = state.kind === 'demo'

  // Keyboard map (Phase 38 plan 38-04c / XR-06 / WCAG 2.1 AA 1.3.1 + 2.1.1):
  // - Space → togglePlay (pre-existing behavior, unchanged)
  // - ArrowLeft / ArrowRight → seek ±5s
  // - Digit 0-9 → jump to N/10 of duration (no-op if duration not finite)
  const onContainerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      togglePlay()
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      seekTo(Math.max(0, currentTime - 5))
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      seekTo(Math.min(duration, currentTime + 5))
      return
    }
    // Digit 0-9 → jump to N/10 of duration. e.key is a single character; parseInt
    // returns NaN for non-digits, so the bounds check guarantees only 0-9 fire.
    if (e.key.length === 1) {
      const digit = parseInt(e.key, 10)
      if (
        !Number.isNaN(digit) &&
        digit >= 0 &&
        digit <= 9 &&
        Number.isFinite(duration) &&
        duration > 0
      ) {
        e.preventDefault()
        seekTo((digit / 10) * duration)
      }
    }
  }

  return (
    <div
      role="region"
      aria-label={t('inmobiliaria.ai.cobranza.call.player.play')}
      aria-describedby="audio-seek-help"
      onKeyDown={onContainerKey}
      tabIndex={0}
      className="rounded-xl border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {/* Visually-hidden keyboard help for screen-reader users (XR-06) */}
      <span id="audio-seek-help" className="sr-only">
        {t('inmobiliaria.ai.cobranza.call.player.seekHelp')}
      </span>
      <audio ref={audioRef} src={objectUrl} preload="metadata" />

      {/*
        Este audio NO es una grabación: es una lectura sintética de un guion,
        para que las llamadas sembradas no queden con transcripción y sin audio.
        Se rotula siempre — un artefacto con forma de evidencia que no se
        anuncia como sintético es exactamente el problema que evitamos.
      */}
      {esDemo && (
        <p className="mb-2 text-xs text-fg-muted">
          {t('inmobiliaria.ai.cobranza.call.player.syntheticNotice')}
        </p>
      )}

      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <IconButton
          type="button"
          variant="ghost"
          onClick={togglePlay}
          aria-label={
            isPlaying
              ? t('inmobiliaria.ai.cobranza.call.player.pause')
              : t('inmobiliaria.ai.cobranza.call.player.play')
          }
          aria-pressed={isPlaying}
          className="min-h-11 min-w-11 rounded-full bg-ink hover:bg-ink/90 text-primary-fg"
          icon={
            isPlaying ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )
          }
        />

        {/* Time + progress */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs tabular-nums text-fg-muted min-w-[4ch]">
            {formatSec(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label={t('inmobiliaria.ai.cobranza.call.transcript.seekAria', {
              time: formatSec(currentTime),
            })}
            aria-valuemin={0}
            aria-valuemax={Number.isFinite(duration) && duration > 0 ? duration : 0}
            aria-valuenow={Math.floor(currentTime)}
            aria-valuetext={formatSec(currentTime)}
            className="flex-1 h-11 accent-[#14130F] cursor-pointer"
            // h-11 gives a 44px tap row; the visual thumb sits centered inside.
          />
          <span className="text-xs tabular-nums text-fg-muted min-w-[4ch]">
            {formatSec(duration)}
          </span>
        </div>
      </div>

      {/* Speed control */}
      <div
        className="mt-3 flex items-center gap-2"
        role="group"
        aria-label={t('inmobiliaria.ai.cobranza.call.player.speed')}
      >
        <span className="text-xs text-fg-subtle">
          {t('inmobiliaria.ai.cobranza.call.player.speed')}
        </span>
        <SegmentedControl
          value={String(speed)}
          onChange={(v) => setSpeed(Number(v) as PlaybackSpeed)}
          aria-label={t('inmobiliaria.ai.cobranza.call.player.speed')}
          options={ALLOWED_SPEEDS.map((s: PlaybackSpeed) => ({
            value: String(s),
            label: `${s}x`,
          }))}
        />
      </div>
    </div>
  )
}
