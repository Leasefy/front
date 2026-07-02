'use client'

// Phase 31 plan 31-10 (COBR-UI-04) — call audio player.
// Native <audio> consuming the range-byte proxy from Plan 31-05.
// Browser handles Range/206 negotiation automatically; DO NOT add MediaSource.

import { useEffect, useState, type KeyboardEvent } from 'react'
import { IconButton, SegmentedControl } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import {
  ALLOWED_SPEEDS,
  useAudioPlayer,
  type PlaybackSpeed,
} from '@/lib/hooks/cobranza/use-audio-player'

interface CallAudioPlayerProps {
  callId: string
  agencyId: string
  hasRecording: boolean
  /** Shared ref so transcript click-to-seek drives the same element. */
  audioRef: React.RefObject<HTMLAudioElement>
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
  hasRecording,
  audioRef,
}: CallAudioPlayerProps) {
  const { t } = useI18n()
  const { currentTime, duration, isPlaying, speed, setSpeed, seekTo, togglePlay } =
    useAudioPlayer(audioRef)

  // Reset transient state when callId changes.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }, [callId, audioRef])

  // The audio endpoint is Bearer-only — a native <audio src> (or crossOrigin
  // "use-credentials") cannot attach the Authorization header, so it 401'd.
  // Fetch the bytes with the bearer header and feed an object URL instead.
  const [objectUrl, setObjectUrl] = useState<string>('')
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    if (!hasRecording) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId || !callId) return
    let cancelled = false
    let createdUrl = ''
    setAudioError(false)
    setObjectUrl('')
    const url = `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/audio`
    void fetch(url, { headers: agentAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`)
        return r.blob()
      })
      .then((blob) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setObjectUrl(createdUrl)
      })
      .catch(() => {
        if (!cancelled) setAudioError(true)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [hasRecording, agencyId, callId])

  if (!hasRecording) {
    // Parent handles the empty-state copy.
    return null
  }

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
      className="rounded-xl border border-border bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {/* Visually-hidden keyboard help for screen-reader users (XR-06) */}
      <span id="audio-seek-help" className="sr-only">
        {t('inmobiliaria.ai.cobranza.call.player.seekHelp')}
      </span>
      <audio ref={audioRef} src={objectUrl} preload="metadata" />

      {audioError && (
        <p className="mb-2 text-xs text-danger" role="status">
          {t('inmobiliaria.ai.cobranza.call.player.audioError')}
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
