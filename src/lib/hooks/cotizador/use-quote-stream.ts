'use client'
/**
 * useQuoteStream — EventSource consumer for the cotizador SSE relay.
 * Phase 30 plan 30-06 | COTI-UI-03 | XR-02 | XR-03
 *
 * Connects to: ${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/cotizador/quote/:quoteId/stream
 * Opens with { withCredentials: true } for session-cookie auth.
 *
 * Reconnect strategy:
 *   - Auto-reconnect on `visibilitychange` (tab re-focus) and `online` event.
 *   - Exponential backoff: 1s → 2s → 4s (max 3 retries).
 *   - After 3 failures: sets error = 'CONNECTION_INTERRUPTED', stops retrying.
 *   - Manual reconnect: call reconnect() (resets retryCount to 0).
 *
 * Last-Event-ID resume:
 *   Browsers only send Last-Event-ID automatically on browser-managed reconnect.
 *   For manual close+reopen we append ?lastEventId=<cursor> to the URL.
 *   TODO (30-03 followup): ensure the relay reads ?lastEventId query param as
 *   fallback for the Last-Event-ID header on manual reconnects.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { parseSSEEvent, type ParsedSSEEvent } from '@/lib/cotizador/sse-schemas'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarrierState {
  carrier: string
  status: 'pending' | 'approved' | 'conditional' | 'rejected' | 'error' | 'stub'
  primaMensualCop: number | null
  condiciones: string[]
  motivoRechazo: string | null  // from carrier.error message or rejection condiciones
  latencyMs: number | null      // Date.now() - startedAtMs at verdict arrival
  isStub: boolean
  startedAtMs: number | null
}

export interface UseQuoteStreamResult {
  events: ParsedSSEEvent[]
  carriers: CarrierState[]     // ordered per current sort rule
  totalCostUsd: number         // running total from agent.cost_recorded events
  isConnected: boolean
  error: string | null
  reconnect: () => void        // manual trigger for "Reintentar" button
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const BACKOFF_DELAYS = [1000, 2000, 4000] as const

const CARRIER_EVENT_TYPES = [
  'carrier.start',
  'carrier.dispatched',
  'carrier.verdict',
  'carrier.verdict_received',
  'carrier.error',
  'agent.partial_ranking',
  'agent.recovery',
  'agent.cost_recorded',
  'agent.heartbeat',
  'agent.final_verdict',
  'agent.session_expired',
] as const

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

const VERDICT_ORDER: Record<CarrierState['status'], number> = {
  approved:    0,
  conditional: 1,
  rejected:    2,
  error:       3,
  stub:        4,
  pending:     5,
}

function sortCarriers(carriers: CarrierState[], allFinal: boolean): CarrierState[] {
  if (!allFinal) {
    // Stable alpha order while pending: descending by name → Sura, Mapfre, Bolívar
    return [...carriers].sort((a, b) => b.carrier.localeCompare(a.carrier, 'es'))
  }
  // On all-final: approved cheapest first, then conditional, rejected, error/stub
  return [...carriers].sort((a, b) => {
    const orderA = VERDICT_ORDER[a.status]
    const orderB = VERDICT_ORDER[b.status]
    if (orderA !== orderB) return orderA - orderB
    // Within same group: sort by prima ascending (null last)
    const primaA = a.primaMensualCop ?? Infinity
    const primaB = b.primaMensualCop ?? Infinity
    return primaA - primaB
  })
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuoteStream(
  quoteId: string,
  agencyId: string | null,
): UseQuoteStreamResult {
  const [events, setEvents] = useState<ParsedSSEEvent[]>([])
  const [carriersMap, setCarriersMap] = useState<Map<string, CarrierState>>(new Map())
  const [totalCostUsd, setTotalCostUsd] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFinal, setAllFinal] = useState(false)

  // Refs for mutable state that doesn't need re-render
  const esRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const lastSeqIdRef = useRef('0')
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Build the SSE URL
  const buildUrl = useCallback((cursor: string): string => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
    const base = `${agentUrl}/api/agency/${agencyId}/cotizador/quote/${quoteId}/stream`
    if (cursor && cursor !== '0') {
      return `${base}?lastEventId=${encodeURIComponent(cursor)}`
    }
    return base
  }, [quoteId, agencyId])

  const closeEs = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const openEs = useCallback((cursor: string) => {
    if (!agencyId || !mountedRef.current) return

    closeEs()

    const url = buildUrl(cursor)
    // EventSource with withCredentials for session-cookie auth
    // @ts-expect-error — EventSource constructor options type may not include withCredentials in all lib defs
    const es = new EventSource(url, { withCredentials: true }) as EventSource
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      retryCountRef.current = 0
      setIsConnected(true)
      setError(null)
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      setIsConnected(false)

      retryCountRef.current += 1
      if (retryCountRef.current <= MAX_RETRIES) {
        const delay = BACKOFF_DELAYS[retryCountRef.current - 1] ?? 4000
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            openEs(lastSeqIdRef.current)
          }
        }, delay)
      } else {
        setError('CONNECTION_INTERRUPTED')
        closeEs()
      }
    }

    // Register named event listeners
    for (const eventType of CARRIER_EVENT_TYPES) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        if (!mountedRef.current) return

        // Track last sequence id for cursor-based resume
        if (event.lastEventId) {
          lastSeqIdRef.current = event.lastEventId
        }

        const parsed = parseSSEEvent(event.data as string, eventType)
        setEvents(prev => [...prev, parsed])

        // Update carrier state
        if (parsed.type === 'carrier.start' || parsed.type === 'carrier.dispatched') {
          const { carrier, started_at_ms } = parsed.data
          const isStub = started_at_ms === 0
          setCarriersMap(prev => {
            const next = new Map(prev)
            next.set(carrier, {
              carrier,
              status: isStub ? 'stub' : 'pending',
              primaMensualCop: null,
              condiciones: [],
              motivoRechazo: null,
              latencyMs: null,
              isStub,
              startedAtMs: started_at_ms,
            })
            return next
          })
        }

        if (parsed.type === 'carrier.verdict' || parsed.type === 'carrier.verdict_received') {
          const { carrier, verdict, prima_mensual_cop, condiciones } = parsed.data
          setCarriersMap(prev => {
            const next = new Map(prev)
            const existing = next.get(carrier)
            const latencyMs = existing?.startedAtMs
              ? Date.now() - existing.startedAtMs
              : null
            next.set(carrier, {
              ...(existing ?? {
                carrier,
                isStub: false,
                startedAtMs: null,
              }),
              carrier,
              status: verdict === 'error' ? 'error' : verdict,
              primaMensualCop: prima_mensual_cop,
              condiciones: condiciones ?? [],
              motivoRechazo: null,
              latencyMs,
            } as CarrierState)
            return next
          })
        }

        if (parsed.type === 'carrier.error') {
          const { carrier, message } = parsed.data
          setCarriersMap(prev => {
            const next = new Map(prev)
            const existing = next.get(carrier)
            next.set(carrier, {
              ...(existing ?? {
                carrier,
                isStub: false,
                startedAtMs: null,
              }),
              carrier,
              status: 'error',
              primaMensualCop: null,
              condiciones: [],
              motivoRechazo: message,
              latencyMs: existing?.startedAtMs ? Date.now() - existing.startedAtMs : null,
            } as CarrierState)
            return next
          })
        }

        if (parsed.type === 'agent.cost_recorded') {
          setTotalCostUsd(parsed.data.running_total_usd)
        }

        if (parsed.type === 'agent.final_verdict') {
          setAllFinal(true)
          setIsConnected(false)
          es.close()
          esRef.current = null
        }

        if (parsed.type === 'agent.session_expired') {
          setError(parsed.data.error)
          setIsConnected(false)
          es.close()
          esRef.current = null
        }
      } as EventListener)
    }
  }, [agencyId, buildUrl, closeEs])

  // Expose manual reconnect
  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    setError(null)
    openEs(lastSeqIdRef.current)
  }, [openEs])

  // Initial connection + cleanup
  useEffect(() => {
    mountedRef.current = true
    openEs('0')

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        openEs(lastSeqIdRef.current)
      }
    }

    const handleOnline = () => {
      openEs(lastSeqIdRef.current)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      mountedRef.current = false
      closeEs()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [openEs, closeEs])

  // Derive sorted carriers array
  const carriers = sortCarriers(Array.from(carriersMap.values()), allFinal)

  return { events, carriers, totalCostUsd, isConnected, error, reconnect }
}
