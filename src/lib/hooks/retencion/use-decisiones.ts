'use client'

/**
 * Hooks de la cola de revisión de decisiones autónomas de Laura (T-323).
 * Patrón calcado de `useRetencionBandeja`: useAuth → agencyId, fetch con bearer,
 * estados { data, isLoading, error, usingMock, refetch }. Mock-first vía el
 * cliente (`usingMock`). Las deps de useCallback son PRIMITIVOS para que el
 * efecto no se reejecute por identidad de objeto.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchDecisions, patchDecisionReview } from '@/lib/api/retencion'
import type {
  DecisionsResult,
  PatchDecisionResult,
  ReviewOutcome,
} from '@/lib/types/retencion'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  usingMock: boolean
}

const TIMEOUT_MS = 12_000

export interface UseDecisionesOpts {
  reviewableOnly?: boolean
  caseId?: string
  limit?: number
}

export function useDecisiones(opts: UseDecisionesOpts = {}) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  // Desestructuramos a primitivos para las deps del useCallback.
  const reviewableOnly = opts.reviewableOnly ?? false
  const caseId = opts.caseId ?? ''
  const limit = opts.limit ?? 0

  const [state, setState] = useState<AsyncState<DecisionsResult>>({
    data: null,
    isLoading: true,
    error: null,
    usingMock: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    setState((s) => ({ ...s, isLoading: true }))
    try {
      const { data, usingMock } = await fetchDecisions(
        agencyId ?? 'demo',
        {
          reviewableOnly,
          caseId: caseId || undefined,
          limit: limit > 0 ? limit : undefined,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setState({ data, isLoading: false, error: null, usingMock })
    } catch (err) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : 'error' }))
    } finally {
      clearTimeout(timer)
    }
  }, [agencyId, reviewableOnly, caseId, limit])

  useEffect(() => {
    void refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { ...state, refetch }
}

export function useReviewDecision() {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [isReviewing, setIsReviewing] = useState(false)

  const review = useCallback(
    async (
      decisionId: string,
      outcome: ReviewOutcome,
      reviewedBy?: string,
    ): Promise<PatchDecisionResult> => {
      setIsReviewing(true)
      try {
        const { data } = await patchDecisionReview(agencyId ?? 'demo', decisionId, {
          reviewOutcome: outcome,
          reviewedBy,
        })
        return data
      } finally {
        setIsReviewing(false)
      }
    },
    [agencyId],
  )

  return { review, isReviewing }
}
