'use client'

/**
 * use-conciliacion-summary.ts — Conciliación Sala wiring (build C).
 *
 * Reads the server-side typed summary the queue UI previously derived
 * client-side (the `// TODO(backend)` in use-conciliacion-queue.ts):
 *
 *   GET /api/agency/{agencyId}/conciliacion/summary
 *
 * Response shape mirrors conciliacion-summary.ts (verified against the route):
 *   - taxonomy: { parciales, duplicados, diferencias_monto, fuera_de_fecha, sin_identificar }
 *   - totals:   { movimientos, conciliados, en_cola, monto_conciliado_cop }
 *   - tasa_conciliacion: number | null  (conciliados / movimientos × 100, one decimal;
 *                                        null when there are zero movimientos)
 *
 * FAIL-SOFT (the backend may not be deployed yet → 404, or stub-mode → 503):
 *   - missing NEXT_PUBLIC_AGENT_URL / no agencyId → isLoading=false, data=null (return).
 *   - 404 (route not deployed)                    → notAvailable=true, data=null, NO error.
 *   - any other non-OK / network error            → error set.
 *
 * ── Lo que cambió (auditoría de casos de error 13-09, K1 y K3) ─────────────
 *
 * 1. Un REFRESCO que falla ya no borra lo que se estaba mostrando: antes ponía
 *    `data` en null y los KPIs desaparecían sin una palabra en medio del
 *    sondeo de una corrida. Ahora `data` queda con la última lectura buena y
 *    `error` dice que la de ahora falló — la pantalla decide cómo decirlo.
 *    Al cambiar de inmobiliaria sí se limpia: los números de otra agencia no
 *    se muestran ni un instante.
 *
 * 2. `refetch` devuelve lo que leyó ESTA vez. El sondeo de la Sala leía el
 *    resultado de una referencia actualizada en el render, que no está
 *    garantizado que haya ocurrido cuando la promesa resuelve; y como el
 *    `catch` de acá se tragaba todo, la pantalla no tenía cómo enterarse de
 *    que la lectura había fallado.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── API shape (matched to conciliacion-summary.ts backend route) ─────────────

export interface ConciliacionSummaryTaxonomy {
  parciales: number
  duplicados: number
  diferencias_monto: number
  fuera_de_fecha: number
  sin_identificar: number
}

export interface ConciliacionSummaryTotals {
  movimientos: number
  conciliados: number
  en_cola: number
  monto_conciliado_cop: number
}

export interface ConciliacionSummaryResponse {
  tenantId: string
  generatedAt: string
  taxonomy: ConciliacionSummaryTaxonomy
  totals: ConciliacionSummaryTotals
  /** conciliados / movimientos × 100, one decimal; null when no movimientos. */
  tasa_conciliacion: number | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Lo que devolvió UNA lectura. `{ data: null, error: null }` cuando no hubo
 * nada que leer (sin URL del micro, sin agencia, ruta no desplegada, o la
 * lectura quedó abortada por otra más nueva).
 */
export interface LecturaDelResumen {
  data: ConciliacionSummaryResponse | null
  error: string | null
}

export interface UseConciliacionSummaryResult {
  /** La última lectura buena. Un refresco fallido NO la borra. */
  data: ConciliacionSummaryResponse | null
  isLoading: boolean
  /** La última lectura falló. Puede convivir con `data` (lo de antes). */
  error: string | null
  /** Backend 404 — endpoint not deployed yet (NOT an error; caller falls back). */
  notAvailable: boolean
  refetch: () => Promise<LecturaDelResumen>
}

const NADA: LecturaDelResumen = { data: null, error: null }

export function useConciliacionSummary(): UseConciliacionSummaryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<ConciliacionSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (): Promise<LecturaDelResumen> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionSummary] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return NADA
    }
    if (!agencyId) {
      setIsLoading(false)
      return NADA
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const url = `${agentUrl}/api/agency/${agencyId}/conciliacion/summary`

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url, {
        headers: agentAuthHeaders(),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return NADA
      if (res.status === 404) {
        // Route not deployed yet — graceful, NOT an error.
        setData(null)
        setNotAvailable(true)
        setError(null)
        return NADA
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConciliacionSummaryResponse
      if (controller.signal.aborted) return NADA
      setData(json)
      setNotAvailable(false)
      setError(null)
      return { data: json, error: null }
    } catch (err) {
      if (controller.signal.aborted) return NADA
      const mensaje = err instanceof Error ? err.message : 'Failed to fetch conciliación summary'
      // K1: lo ya mostrado se queda. Quien pinta decide si decir «estos
      // números son de la última lectura» o, si no hay nada, el fallo entero.
      setError(mensaje)
      return { data: null, error: mensaje }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    // Otra inmobiliaria: lo leído de la anterior no se muestra ni un instante.
    setData(null)
    setError(null)
    setNotAvailable(false)
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
