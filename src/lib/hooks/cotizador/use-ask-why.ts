'use client'

// Phase 33 plan 33-04 (COTI-UI-04, D-33-01, D-33-05, D-33-07, D-33-13)
// Custom hook wrapping POST /api/agency/:id/cotizador/ask-why.
// No SWR library installed in mvp — manual useState pattern with 5 typed
// error branches (429/404/timeout/5xx/400) plus network error (TypeError).
//
// Security note (T-33-04-03): the daily cap is enforced server-side; this
// hook only surfaces the 429 error. Bypassing the disabled submit in the UI
// still results in 429 from the backend.

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

export type AskWhyVariable = 'canon' | 'ciudad' | 'tipo' | 'codeudores'

export interface AskWhyNewValue {
  canon?: number
  ciudad?: string
  tipo?: string
  codeudores?: number
}

export interface AskWhyResult {
  narrative_es: string
  cost_usd: number
  hypothetical_carriers: CarrierState[]
}

export type AskWhyError =
  | { code: 429; cap: number; used: number; resets_at: string }
  | { code: 404 }
  | { code: 'timeout' }
  | { code: 500 | 'network' }
  | { code: 400; message: string }

export interface AskWhyPayload {
  quote_id: string
  variable: AskWhyVariable
  new_value: AskWhyNewValue[AskWhyVariable]
}

const REQUEST_TIMEOUT_MS = 10_000

export function useAskWhy(agencyId: string | null): {
  mutate: (payload: AskWhyPayload) => Promise<AskWhyResult>
  isLoading: boolean
  error: AskWhyError | null
  reset: () => void
} {
  useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AskWhyError | null>(null)
  const inflightRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setError(null)
  }, [])

  const mutate = useCallback(
    async (payload: AskWhyPayload): Promise<AskWhyResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agencyId || !agentUrl) {
        const networkErr: AskWhyError = { code: 'network' }
        setError(networkErr)
        throw networkErr
      }

      // Abort any previous in-flight request before starting a new one.
      inflightRef.current?.abort()
      const controller = new AbortController()
      inflightRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      setIsLoading(true)
      setError(null)

      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cotizador/ask-why`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          },
        )

        if (!res.ok) {
          // Parse JSON body when possible; status code drives the error shape.
          let body: { error?: string; cap?: number; used?: number; resets_at?: string } = {}
          try {
            body = await res.json()
          } catch {
            // empty body / non-JSON — ignore
          }

          let typed: AskWhyError
          if (res.status === 429) {
            typed = {
              code: 429,
              cap: body.cap ?? 0,
              used: body.used ?? 0,
              resets_at: body.resets_at ?? '',
            }
          } else if (res.status === 404) {
            typed = { code: 404 }
          } else if (res.status === 400) {
            typed = { code: 400, message: body.error ?? 'invalid_request' }
          } else {
            typed = { code: 500 }
          }
          setError(typed)
          throw typed
        }

        const json: AskWhyResult = await res.json()
        return json
      } catch (caught) {
        // Already-typed AskWhyError thrown above — re-throw without re-handling.
        if (
          caught &&
          typeof caught === 'object' &&
          'code' in (caught as Record<string, unknown>)
        ) {
          throw caught
        }
        // AbortError = either explicit abort or timeout.
        if (caught instanceof Error && caught.name === 'AbortError') {
          const typed: AskWhyError = { code: 'timeout' }
          setError(typed)
          throw typed
        }
        // Anything else = network failure.
        const typed: AskWhyError = { code: 'network' }
        setError(typed)
        throw typed
      } finally {
        clearTimeout(timeoutId)
        if (inflightRef.current === controller) {
          inflightRef.current = null
        }
        setIsLoading(false)
      }
    },
    [agencyId],
  )

  return { mutate, isLoading, error, reset }
}
