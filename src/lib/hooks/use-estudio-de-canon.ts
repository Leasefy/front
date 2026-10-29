'use client'

/**
 * use-estudio-de-canon — the caller's current free document study (T-0193, T-0195).
 *
 * Source: `GET /calificacion-leasefy/estudio/actual`. T-0195 contract §3.4:
 *
 *   · One fetch on mount / reload.
 *   · While the study is PROCESSING, one more fetch every 120 s (the back does
 *     one agent poll per GET, so the cadence is deliberately slow).
 *   · COMPLETED / FAILED / DRAFT / no study: NO timer and NO further calls until
 *     the person acts (reintentar, new study, reload).
 *   · The timer is cleaned on unmount and when the study leaves PROCESSING.
 *   · A tick is skipped while the tab is hidden; when the tab becomes visible
 *     again and the last fetch is older than the interval, it fetches once.
 *
 * Other rules kept from T-0193:
 *   · Ticks are SILENT (they never touch `isLoading`).
 *   · A failed tick keeps the last known study and keeps the cadence (no tight
 *     retry loop): a transient error must never look like a failed study.
 *   · Requests never overlap: if one is in flight the new one is skipped.
 *   · `setEstudio` lets the wizard push the study returned by crear / subir /
 *     iniciar / reintentar so the screen reacts without an extra GET.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { estudioDeCanonApi } from '@/lib/api/estudio-de-canon.service'
import type { EstudioDeCanon } from '@/lib/api/estudio-de-canon.types'

/** Contract §3.4: re-fetch every 120 s while PROCESSING. */
export const INTERVALO_DE_CONSULTA_MS = 120_000

export interface UseEstudioDeCanonOptions {
  /** `false` turns the hook off (no session / not a tenant). Default `true`. */
  enabled?: boolean
}

export interface UseEstudioDeCanonResult {
  estudio: EstudioDeCanon | null
  isLoading: boolean
  /** Only set when the FIRST load fails; poll failures are swallowed. */
  error: string | null
  refetch: () => void
  setEstudio: (e: EstudioDeCanon | null) => void
}

export function useEstudioDeCanon(options?: UseEstudioDeCanonOptions): UseEstudioDeCanonResult {
  const enabled = options?.enabled ?? true
  const [estudio, setEstudio] = useState<EstudioDeCanon | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const enVueloRef = useRef(false)
  const ultimaConsultaRef = useRef(0)

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!enabled || enVueloRef.current) return
      enVueloRef.current = true
      ultimaConsultaRef.current = Date.now()
      if (!silencioso) {
        setIsLoading(true)
        setError(null)
      }
      try {
        setEstudio(await estudioDeCanonApi.actual())
      } catch (e) {
        if (!silencioso) {
          setEstudio(null)
          setError(e instanceof Error ? e.message : 'No pudimos cargar tu estudio.')
        }
      } finally {
        if (!silencioso) setIsLoading(false)
        enVueloRef.current = false
      }
    },
    [enabled],
  )

  useEffect(() => {
    void cargar()
  }, [cargar])

  const procesando = enabled && estudio?.status === 'PROCESSING'

  // The timer exists ONLY while the study is PROCESSING.
  useEffect(() => {
    if (!procesando) return
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      void cargar(true)
    }, INTERVALO_DE_CONSULTA_MS)

    const alVolver = () => {
      if (document.hidden) return
      if (Date.now() - ultimaConsultaRef.current >= INTERVALO_DE_CONSULTA_MS) void cargar(true)
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [procesando, cargar])

  return { estudio, isLoading, error, refetch: () => void cargar(), setEstudio }
}
