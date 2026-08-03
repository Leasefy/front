'use client'

/**
 * use-chat-lessons — data hook for the AI chat "self-learning lessons"
 * certification fence (F3). Mirrors use-ai-hub-landing.ts:
 *   - agencyId comes from useAuth().agency?.id
 *   - both no-config and no-agency branches resolve loading (never spin forever)
 *   - in-flight requests are aborted on unmount / refetch
 *
 * Unlike the landing hook this does NOT poll — lessons change only when a human
 * certifies/rejects, so we refetch after each certify (the canonical state is
 * the backend's verdict, which can be a fail-closed `applied: false`).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  getChatLessons,
  certifyChatLesson,
  type ChatLesson,
  type CertifyDecision,
  type CertifyLessonResponse,
} from '@/lib/api/ai-hub-lessons'

export interface UseChatLessonsResult {
  lessons: ChatLesson[]
  /** Master switch — certified lessons are only applied to the chat when true. */
  enabled: boolean
  isLoading: boolean
  error: string | null
  /**
   * Certify or reject a lesson. Returns the backend verdict so the caller can
   * surface `reason` when `applied === false`. Refetches on success to reflect
   * the new status. Throws on transport errors (e.g. 403 for VIEWER).
   */
  certify: (lessonId: string, decision: CertifyDecision) => Promise<CertifyLessonResponse>
  refresh: () => Promise<void>
}

export function useChatLessons(): UseChatLessonsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [lessons, setLessons] = useState<ChatLesson[]>([])
  const [enabled, setEnabled] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchOnce = useCallback(async () => {
    // Fail-soft when the backend is not wired in this build (mirror landing).
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    try {
      const res = await getChatLessons(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setLessons(res.lessons)
      setEnabled(res.enabled)
      setError(null)
    } catch (err) {
      // An abort is expected on unmount/refetch — not a user-facing error.
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
        return
      }
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
    return () => abortRef.current?.abort()
  }, [fetchOnce, agencyId])

  const refresh = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const certify = useCallback(
    async (lessonId: string, decision: CertifyDecision): Promise<CertifyLessonResponse> => {
      if (!agencyId) {
        throw new Error('No hay inmobiliaria activa')
      }
      const result = await certifyChatLesson({ agencyId, lessonId, decision })
      // Refetch on any applied change so the list reflects the new status.
      // When the fence blocked the certify (applied === false) the status is
      // unchanged on the backend; we still refetch so the row resets cleanly.
      await fetchOnce()
      return result
    },
    [agencyId, fetchOnce],
  )

  return { lessons, enabled, isLoading, error, certify, refresh }
}
