'use client'

// Phase 31 plan 31-10 (COBR-UI-04) — call audio player.
// Native <audio> consuming the range-byte proxy from Plan 31-05.
// Browser handles Range/206 negotiation automatically; DO NOT add MediaSource.

import { useEffect, type KeyboardEvent } from 'react'
import { useI18n } from '@/lib/i18n'
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

  if (!hasRecording) {
    // Parent handles the empty-state copy.
    return null
  }

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
  const src = agentUrl
    ? `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/audio`
    : ''

  const onContainerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      togglePlay()
    }
  }

  return (
    <div
      role="region"
      aria-label={t('inmobiliaria.ai.cobranza.call.player.play')}
      onKeyDown={onContainerKey}
      tabIndex={0}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        // httpOnly session cookie travels via fetch credentials; native <audio>
        // sends credentials cross-origin only when crossOrigin="use-credentials".
        crossOrigin="use-credentials"
      />

      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={
            isPlaying
              ? t('inmobiliaria.ai.cobranza.call.player.pause')
              : t('inmobiliaria.ai.cobranza.call.player.play')
          }
          aria-pressed={isPlaying}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          {isPlaying ? (
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
          )}
        </button>

        {/* Time + progress */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400 min-w-[4ch]">
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
            className="flex-1 h-11 accent-violet-600 cursor-pointer"
            // h-11 gives a 44px tap row; the visual thumb sits centered inside.
          />
          <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400 min-w-[4ch]">
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
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.call.player.speed')}
        </span>
        {ALLOWED_SPEEDS.map((s: PlaybackSpeed) => {
          const active = s === speed
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={active}
              aria-label={t('inmobiliaria.ai.cobranza.call.player.speedLabel', {
                speed: String(s),
              })}
              className={
                'min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold transition-colors ' +
                (active
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700')
              }
            >
              {s}x
            </button>
          )
        })}
      </div>
    </div>
  )
}
