'use client'
/**
 * useQuoteStream — SSE consumer for the cotizador relay.
 * Phase 30 plan 30-06 | COTI-UI-03 | XR-02 | XR-03
 *
 * Connects to: ${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/cotizador/quote/:quoteId/stream
 * Authenticated with the user's Supabase JWT via agentAuthHeaders()
 * (Authorization: Bearer). The agent service is Bearer-only and reads no
 * cookies, so a native EventSource(withCredentials) cookie handshake 401'd in
 * prod — we read the stream with fetch()+ReadableStream and parse SSE frames.
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
import type {
  SSEFinalVerdictSchema,
  SSEPartialRankingSchema,
} from '@/lib/cotizador/sse-schemas'
import type { z } from 'zod'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

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

// The agent's natural-language conclusion + recommendation payload (terminal
// SSE frame). The CONCLUSIÓN / RECOMENDACIÓN block (VeredictoAsegurabilidad)
// reads these structured fields, which the carrier-grid pipeline used to drop.
export type FinalVerdict = z.infer<typeof SSEFinalVerdictSchema>
export type PartialRanking = z.infer<typeof SSEPartialRankingSchema>

export interface UseQuoteStreamResult {
  events: ParsedSSEEvent[]
  carriers: CarrierState[]     // ordered per current sort rule
  totalCostUsd: number         // running total from agent.cost_recorded events
  finalVerdict: FinalVerdict | null    // agent.final_verdict (natural-language conclusion + best option)
  partialRanking: PartialRanking | null  // agent.partial_ranking (carrier ordering + accepting_count)
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
  const [finalVerdict, setFinalVerdict] = useState<FinalVerdict | null>(null)
  const [partialRanking, setPartialRanking] = useState<PartialRanking | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFinal, setAllFinal] = useState(false)

  // Refs for mutable state that doesn't need re-render
  const abortRef = useRef<AbortController | null>(null)
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
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  // Handle one fully-parsed SSE frame. Mirrors the old EventSource listener
  // body verbatim; final_verdict / session_expired abort the fetch stream
  // instead of calling es.close().
  const handleParsed = useCallback((eventType: string, data: string, id: string) => {
    if (!mountedRef.current) return
    // Only the named carrier events are handled (default `message` / unknown
    // frames are ignored, as with the old addEventListener registration).
    if (!(CARRIER_EVENT_TYPES as readonly string[]).includes(eventType)) return

    // Track last sequence id for cursor-based resume.
    if (id) lastSeqIdRef.current = id

    const parsed = parseSSEEvent(data, eventType)
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

    // agent.partial_ranking can arrive multiple times as carriers settle —
    // keep the latest so VeredictoAsegurabilidad orders the recommendation by
    // total_score and shows the live accepting_count.
    if (parsed.type === 'agent.partial_ranking') {
      setPartialRanking(parsed.data)
    }

    if (parsed.type === 'agent.final_verdict') {
      setFinalVerdict(parsed.data)
      setAllFinal(true)
      setIsConnected(false)
      abortRef.current?.abort()
      abortRef.current = null
    }

    if (parsed.type === 'agent.session_expired') {
      setError(parsed.data.error)
      setIsConnected(false)
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  const openEs = useCallback((cursor: string) => {
    if (!agencyId || !mountedRef.current) return

    closeEs()

    const url = buildUrl(cursor)
    const ac = new AbortController()
    abortRef.current = ac

    // Replaces es.onerror: drop → backoff retry (resuming from lastEventId) →
    // CONNECTION_INTERRUPTED after MAX_RETRIES.
    const onDrop = () => {
      if (!mountedRef.current) return
      setIsConnected(false)
      retryCountRef.current += 1
      if (retryCountRef.current <= MAX_RETRIES) {
        const delay = BACKOFF_DELAYS[retryCountRef.current - 1] ?? 4000
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) openEs(lastSeqIdRef.current)
        }, delay)
      } else {
        setError('CONNECTION_INTERRUPTED')
        closeEs()
      }
    }

    void (async () => {
      try {
        const headers = agentAuthHeaders({ Accept: 'text/event-stream' })
        // Manual reconnect resume: the relay also reads the Last-Event-ID header.
        if (cursor && cursor !== '0') headers.set('Last-Event-ID', cursor)

        const res = await fetch(url, { headers, signal: ac.signal })
        if (!res.ok || !res.body) {
          onDrop()
          return
        }
        if (!mountedRef.current) return
        // == old es.onopen
        retryCountRef.current = 0
        setIsConnected(true)
        setError(null)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let evName = 'message'
        let dataLines: string[] = []
        let frameId = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buf.indexOf('\n')) >= 0) {
            const rawLine = buf.slice(0, nl)
            buf = buf.slice(nl + 1)
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
            if (line === '') {
              // Blank line ends a frame.
              if (dataLines.length > 0) {
                handleParsed(evName, dataLines.join('\n'), frameId)
              }
              evName = 'message'
              dataLines = []
              frameId = ''
              continue
            }
            if (line.startsWith(':')) continue // comment / keep-alive
            if (line.startsWith('event:')) evName = line.slice(6).trim()
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
            else if (line.startsWith('id:')) frameId = line.slice(3).trim()
          }
        }
        // Server closed the stream without a terminal event → reconnect/resume.
        onDrop()
      } catch (e) {
        // Intentional close (final_verdict, session_expired, unmount, manual
        // reconnect) aborts the controller — not a real failure.
        if ((e as Error)?.name === 'AbortError') return
        onDrop()
      }
    })()
  }, [agencyId, buildUrl, closeEs, handleParsed])

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

  return { events, carriers, totalCostUsd, finalVerdict, partialRanking, isConnected, error, reconnect }
}
