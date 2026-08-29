'use client'

/**
 * Sondea `GET /inmobiliaria/inmuebles/importar/lotes/:lote` mientras el
 * lote sigue `ENCOLADO`/`PROCESANDO` (wu-4-report.md §6).
 *
 * Es una CONVENIENCIA mientras la pestaña sigue abierta — nunca el
 * mecanismo de finalización. El lote, la fila y la notificación
 * (`PROPERTY_IMPORT_COMPLETED`) son todos server-side: cerrar la pestaña no
 * pierde nada, y el sondeo se detiene solo (LISTO/FALLIDO) o al llegar al
 * techo, cayendo a la notificación realtime para enterarse de que terminó.
 *
 * Misma cadencia y forma que `use-estado-de-lote.ts` (contratos) — mismo
 * precedente, mismo anti-precedente (`use-avaluo-status.ts`, N8).
 */

import { useEffect, useState } from 'react'
import { inmueblesImportacionApi, type EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service'

const INTERVALO_MS = 3_000
const TECHO_MS = 10 * 60_000

const ESTADOS_TERMINALES = new Set(['LISTO', 'FALLIDO'])

export function useEstadoDeLoteInmuebles(lote: string | null): {
  estado: EstadoDeLoteInmuebles | null
  /** Se llegó al techo de 10 minutos sin LISTO/FALLIDO — dejamos de sondear. */
  agotado: boolean
} {
  const [estado, setEstado] = useState<EstadoDeLoteInmuebles | null>(null)
  const [agotado, setAgotado] = useState(false)

  useEffect(() => {
    setEstado(null)
    setAgotado(false)
    if (!lote) return

    let vigente = true
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const inicio = Date.now()

    const sondear = async () => {
      if (!vigente) return
      try {
        const r = await inmueblesImportacionApi.estadoDeLote(lote)
        if (!vigente) return
        setEstado(r)
        // Un `estado` no reconocido se trata como "seguir esperando", nunca
        // como error — sólo LISTO/FALLIDO detienen el sondeo.
        if (ESTADOS_TERMINALES.has(r.estado)) return
      } catch {
        // Error transitorio del sondeo — no es el mecanismo de
        // finalización, así que seguimos intentando hasta el techo en vez
        // de mostrar un error.
      }
      if (!vigente) return
      if (Date.now() - inicio >= TECHO_MS) {
        setAgotado(true)
        return
      }
      timeoutId = setTimeout(() => void sondear(), INTERVALO_MS)
    }

    void sondear()

    return () => {
      vigente = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lote])

  return { estado, agotado }
}
