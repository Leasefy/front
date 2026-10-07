'use client'

/**
 * use-carrier-registry.ts — Phase 35 plan 35-07.
 *
 * Polls GET /api/agency/:agencyId/cotizador/aseguradoras/registry every 60s.
 * Also exposes saveOverride (PUT) and resetOverride (DELETE) mutation helpers.
 * Callers are responsible for optimistic state management — the mutation helpers
 * do NOT call refetch() after writing.
 *
 * Follows the exact polling pattern from use-compliance-overview.ts (Phase 34).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDeLaRespuesta } from './fallo-de-la-respuesta'

// =============================================================================
// Types
// =============================================================================

export interface GlobalCarrierRow {
  name: string
  route: string
  mode: 'direct' | 'stub'
  enabled: boolean
  priority: number
  maxCanonCop: number | null
  breachStatus: 'healthy' | 'degraded' | 'breached' | 'unknown'
}

export interface TenantOverrideRow {
  name: string
  route: string
  enabled: boolean | null      // null = inherits global
  priority: number | null
  mode: 'direct' | 'stub' | null
  maxCanonCop: number | null
}

export interface RegistryResponse {
  global: GlobalCarrierRow[]
  overrides: TenantOverrideRow[]
}

export interface OverrideFields {
  enabled: boolean | null
  priority: number | null
  mode: 'direct' | 'stub' | null
  maxCanonCop: number | null
}

const POLL_INTERVAL_MS = 60_000

/** El entorno sin la URL del micro: no es la red ni algo que la persona hizo. */
const SIN_AGENTE = 'El cotizador no está configurado en este entorno. Avísanos si lo ves.'
/** Sin inmobiliaria en la sesión no hay a nombre de quién guardar. */
const SIN_INMOBILIARIA = 'Tu sesión no tiene una inmobiliaria activa. Vuelve a entrar e intenta de nuevo.'

export interface UseCarrierRegistryResult {
  data: RegistryResponse | null
  isLoading: boolean
  /**
   * El fallo entero de la última carga (02-10-2026): un `ApiError` con el
   * status y el cuerpo del micro, o el `TypeError` de un `fetch` que no salió.
   * Antes era el status como texto («403») y la tabla lo pintaba tal cual;
   * ahora `FalloDeCarga` decide qué decir (permiso, de nuestro lado, conexión).
   */
  error: unknown
  refetch: () => Promise<void>
  saveOverride: (carrierName: string, route: string, fields: Partial<OverrideFields>) => Promise<void>
  resetOverride: (carrierName: string, route: string) => Promise<void>
}

// =============================================================================
// Hook
// =============================================================================

export function useCarrierRegistry(): UseCarrierRegistryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<RegistryResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<unknown>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError(new Error(SIN_AGENTE))
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/registry`
      )
      if (!res.ok) throw await falloDeLaRespuesta(res)
      const json = await res.json() as RegistryResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchOnce()
    const id = setInterval(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  /**
   * saveOverride — fires PUT to the override endpoint.
   * Does NOT call refetch() — caller handles optimistic state.
   * Throws on non-2xx responses: un `ApiError` con el status y el cuerpo del
   * micro (`falloDeLaRespuesta`), para que la pantalla lo diga con el traductor.
   */
  const saveOverride = useCallback(async (
    carrierName: string,
    route: string,
    fields: Partial<OverrideFields>,
  ): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) throw new Error(SIN_AGENTE)
    if (!agencyId) throw new Error(SIN_INMOBILIARIA)

    const res = await agentFetch(
      `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrierName}/override`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route, ...fields }),
      },
    )
    if (!res.ok) throw await falloDeLaRespuesta(res)
  }, [agencyId])

  /**
   * resetOverride — fires DELETE to the override endpoint.
   * Does NOT call refetch() — caller handles optimistic state.
   * Throws on non-2xx responses (un `ApiError`, como `saveOverride`).
   */
  const resetOverride = useCallback(async (
    carrierName: string,
    route: string,
  ): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) throw new Error(SIN_AGENTE)
    if (!agencyId) throw new Error(SIN_INMOBILIARIA)

    const res = await agentFetch(
      `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrierName}/override?route=${encodeURIComponent(route)}`,
      {
        method: 'DELETE',
      },
    )
    if (!res.ok) throw await falloDeLaRespuesta(res)
  }, [agencyId])

  return { data, isLoading, error, refetch, saveOverride, resetOverride }
}
