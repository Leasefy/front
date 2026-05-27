'use client'

// NOTE: cotizador_quote_requests is not yet in the Supabase Realtime publication.
// Run the following migration before enabling the channel:
//   ALTER PUBLICATION supabase_realtime ADD TABLE cotizador_quote_requests;
// Until then, the channel subscription is a no-op; 30s polling is the live fallback.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase/client'

// =============================================================================
// Interfaces
// =============================================================================

export interface CotizadorOverviewResponse {
  kpis: {
    quotesHoy: number                   // total quote requests created today (Bogota TZ)
    approvalRate: number                // 0.0–1.0 — approved / total in last 7d
    primaPromedioMonthlyCop: number     // COP, avg prima_mensual_cop across approved last 7d
    costPerQuoteCop: number             // COP, total cost / quote count in last 7d
  }
  lastQuotes: Array<{
    id: string                          // quote_id (UUID)
    cedulaHashPrefix8: string           // first 8 chars of cedula_hash — NEVER raw cédula
    canonCop: number                    // monthly rent in COP
    ciudad: string
    createdAt: string                   // ISO 8601
    status: 'pending' | 'partial' | 'final' | 'error'
    approvedCount: number               // 0–N carriers approved
    totalCarriers: number               // typically 3 (enabled carriers count)
  }>                                    // max 10, ordered by createdAt DESC
  carriers: Array<{
    name: string                        // 'sura' | 'mapfre' | 'bolivar' | future carrier
    route: 'direct' | 'sekure'
    mode: 'stub' | 'rest'
    enabled: boolean                    // only enabled=true present in array
    slaState: 'healthy' | 'degraded' | 'breached'
    lastVerdictAt: string | null        // ISO 8601 or null
  }>
  generatedAt: string                   // ISO 8601
}

export interface QuoteInsertEvent {
  id: string
  cedulaHashPrefix8: string             // first 8 chars of cedula_hash column
  canonCop: number
  ciudad: string
  status: 'pending' | 'partial' | 'final' | 'error'
  createdAt: string
  approvedCount: number                 // 0 initially — Realtime fires on INSERT before responses arrive
  totalCarriers: number                 // resolved from current enabled carriers list (snapshot at time of INSERT)
}

// =============================================================================
// Hook: useCotizadorOverview
// =============================================================================

export function useCotizadorOverview(): {
  data: CotizadorOverviewResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  isRealtimeConnected: boolean
  realtimeQuotes: QuoteInsertEvent[]
} {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<CotizadorOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [realtimeQuotes, setRealtimeQuotes] = useState<QuoteInsertEvent[]>([])

  // ---------------------------------------------------------------------------
  // Polling fetch
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCotizadorOverview] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/overview`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CotizadorOverviewResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cotizador overview')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData, agencyId])

  // ---------------------------------------------------------------------------
  // Realtime subscription (DISABLED — cotizador_quote_requests not yet in
  // Supabase Realtime publication; see file header comment for migration note)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Publication not yet set up — skip subscription, keep isRealtimeConnected=false
    // so the polling fallback remains the live data source.
    const supabase = getSupabase()
    if (!supabase) {
      return
    }

    // When the publication is added, uncomment the following to enable live prepend:
    // if (!agencyId) return
    // const channel = supabase
    //   .channel('agent:cotizador_quote_requests')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'INSERT',
    //       schema: 'public',
    //       table: 'cotizador_quote_requests',
    //       filter: `agency_id=eq.${agencyId}`,
    //     },
    //     (payload) => {
    //       const row = payload.new as Record<string, unknown>
    //       const quote: QuoteInsertEvent = {
    //         id: String(row.id ?? ''),
    //         cedulaHashPrefix8: String(row.cedula_hash ?? '').slice(0, 8),
    //         canonCop: Number(row.canon_cop ?? 0),
    //         ciudad: String(row.ciudad ?? ''),
    //         status: (row.status ?? 'pending') as QuoteInsertEvent['status'],
    //         createdAt: String(row.created_at ?? new Date().toISOString()),
    //         approvedCount: 0,
    //         totalCarriers: 3,
    //       }
    //       setRealtimeQuotes((prev) => [quote, ...prev].slice(0, 10))
    //     },
    //   )
    //   .subscribe((status) => {
    //     setIsRealtimeConnected(status === 'SUBSCRIBED')
    //   })
    // return () => { supabase.removeChannel(channel) }

    setIsRealtimeConnected(false)
    void setRealtimeQuotes // keep reference to avoid unused lint warning
  }, [agencyId])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    isRealtimeConnected,
    realtimeQuotes,
  }
}
