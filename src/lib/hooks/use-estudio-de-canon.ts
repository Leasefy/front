'use client'

/**
 * use-estudio-de-canon — the caller's current free document study (T-0193).
 *
 * Source: `GET /calificacion-leasefy/estudio/actual`. Contract §3.1 A: while the
 * study is PROCESSING the screen polls every 3 s (expected 30-90 s: OCR + Claude
 * vision) and stops on COMPLETED / FAILED. No SSE, no websocket.
 *
 * · Ticks are SILENT (they never touch `isLoading`), so the page does not flash
 *   a skeleton every 3 s.
 * · A failed tick keeps the last known study and keeps polling: a transient
 *   error must never look like a failed study (the back does the same).
 * · Ticks never overlap: if a request is still in flight the tick is skipped.
 * · `setEstudio` lets the wizard push the study returned by crear / subir /
 *   iniciar so the screen reacts without an extra GET.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { estudioDeCanonApi } from '@/lib/api/estudio-de-canon.service'
import type { EstudioDeCanon } from '@/lib/api/estudio-de-canon.types'

/** Contract §3.1 A: poll every 3 s while PROCESSING. */
export const INTERVALO_DE_CONSULTA_MS = 3000

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

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!enabled || enVueloRef.current) return
      enVueloRef.current = true
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

  // The tick decides whether to ask again, so the interval is never recreated.
  const procesandoRef = useRef(false)
  procesandoRef.current = enabled && estudio?.status === 'PROCESSING'

  useEffect(() => {
    const id = setInterval(() => {
      if (procesandoRef.current) void cargar(true)
    }, INTERVALO_DE_CONSULTA_MS)
    return () => clearInterval(id)
  }, [cargar])

  return { estudio, isLoading, error, refetch: () => void cargar(), setEstudio }
}
