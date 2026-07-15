'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'cobranza.audio.speed'
const ALLOWED_SPEEDS = [1, 1.25, 1.5, 2] as const
export type PlaybackSpeed = (typeof ALLOWED_SPEEDS)[number]

function isAllowedSpeed(n: number): n is PlaybackSpeed {
  return (ALLOWED_SPEEDS as readonly number[]).includes(n)
}

function readPersistedSpeed(): PlaybackSpeed {
  if (typeof window === 'undefined') return 1
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return 1
    const parsed = Number.parseFloat(raw)
    return isAllowedSpeed(parsed) ? parsed : 1
  } catch {
    return 1
  }
}

export interface UseAudioPlayerResult {
  audioRef: React.RefObject<HTMLAudioElement>
  currentTime: number
  duration: number
  isPlaying: boolean
  speed: PlaybackSpeed
  setSpeed: (s: PlaybackSpeed) => void
  seekTo: (sec: number) => void
  togglePlay: () => void
}

export function useAudioPlayer(externalRef?: React.RefObject<HTMLAudioElement>): UseAudioPlayerResult {
  const internalRef = useRef<HTMLAudioElement>(null)
  const audioRef = externalRef ?? internalRef
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1)

  // Hydrate persisted speed after mount (SSR-safe).
  useEffect(() => {
    const persisted = readPersistedSpeed()
    setSpeedState(persisted)
    if (audioRef.current) {
      audioRef.current.playbackRate = persisted
    }
  }, [audioRef])

  // Attach media event listeners.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setCurrentTime(el.currentTime)
    const onLoaded = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0)
      el.playbackRate = speed
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [audioRef, speed])

  const setSpeed = useCallback(
    (s: PlaybackSpeed) => {
      if (!isAllowedSpeed(s)) return
      setSpeedState(s)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(s))
        } catch {
          /* ignore quota / privacy-mode errors */
        }
      }
      if (audioRef.current) {
        audioRef.current.playbackRate = s
      }
    },
    [audioRef],
  )

  const seekTo = useCallback(
    (sec: number) => {
      if (!audioRef.current) return
      audioRef.current.currentTime = sec
      void audioRef.current.play().catch(() => {
        /* autoplay policy — silently swallow */
      })
    },
    [audioRef],
  )

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => {
        /* swallow */
      })
    } else {
      el.pause()
    }
  }, [audioRef])

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    speed,
    setSpeed,
    seekTo,
    togglePlay,
  }
}

export { ALLOWED_SPEEDS, STORAGE_KEY }
