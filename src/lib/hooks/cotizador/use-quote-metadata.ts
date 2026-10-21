'use client'

// Phase 30 F-02 follow-up (verifier 2026-05-26)
// Fetches quote metadata (canon, ciudad, tipo, cedulaHashPrefix8) for the
// [quoteId] streaming detail page header + PDF inputs summary. Pairs with the
// agency-cotizador-quote-detail.ts endpoint added in the same commit batch.
// Without this, the page renders `—`/`0` placeholders for inputs.

import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '@/lib/auth/auth-context'
import { agentFetch } from '@/lib/api/agent-fetch'
import type { SeguimientoDeLaCotizacion } from '@/lib/cotizador/seguimiento'

export interface QuoteMetadata {
  quoteId: string
  cedulaHashPrefix8: string
  canonCop: number
  ciudad: string
  tipoInmueble: string
  status: string
  createdAt: string
  completedAt: string | null
  // Phase 33 D-33-10 / D-08: full 64-char SHA-256 hex of the candidate cédula.
  // Optional because pre-33-03 backend responses did not include it. Used by the
  // re-quote pre-fill flow in cotizador/nueva/page.tsx (?from= mode).
  cedulaHash?: string
  // Phase 33 D-33-11 (Plan 33-05): immediate-parent UUID for re-quote lineage.
  // Backend (Plan 33-03) returns null for first-time quotes. Surfaces the
  // ReQuoteOfBadge subtitle on the detail page.
  reQuoteOf: string | null
  /**
   * COTIZ-17/18 (19-10-2026): el nombre del candidato, la elegida y la póliza.
   * Un micro anterior no lo manda; `disponible: false` = falta la migración.
   */
  seguimiento?: SeguimientoDeLaCotizacion
}

export function useQuoteMetadata(quoteId: string): {
  data: QuoteMetadata | null
  isLoading: boolean
  error: string | null
  /** COTIZ-17: lo que devolvió el PUT del seguimiento, sin volver a pedir el detalle. */
  actualizarSeguimiento: (s: SeguimientoDeLaCotizacion) => void
} {
  // Sin exigir la sesión (COTIZ-17: «Nuevo contrato» lo usa sólo con
  // `?cotizacion=`): sin sesión o sin cotización, no pide nada.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null
  const [data, setData] = useState<QuoteMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteId || !agencyId) {
      setIsLoading(false)
      return
    }
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setIsLoading(false)
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cotizador/quote/${quoteId}`
        )
        if (cancelled) return
        if (!res.ok) {
          setError(`${res.status}`)
          setIsLoading(false)
          return
        }
        const json: QuoteMetadata = await res.json()
        setData(json)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch quote metadata')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [quoteId, agencyId])

  const actualizarSeguimiento = (seguimiento: SeguimientoDeLaCotizacion) =>
    setData((d) => (d ? { ...d, seguimiento } : d))

  return { data, isLoading, error, actualizarSeguimiento }
}
