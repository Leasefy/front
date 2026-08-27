'use client'

/**
 * Sondea `GET /contracts/migrar/lotes/:lote` mientras el lote sigue
 * `ENCOLADO`/`PROCESANDO` (contrato §3.2.A2, cadencia frozen en §11-J9: 3s,
 * techo de 10 min).
 *
 * Es una CONVENIENCIA mientras la pestaña sigue abierta — nunca el
 * mecanismo de finalización. El lote, la fila y la notificación son todos
 * server-side (WU-2): cerrar la pestaña no pierde nada, y el sondeo se
 * detiene solo (LISTO/FALLIDO) o al llegar al techo, cayendo a la
 * notificación realtime (`use-notifications-realtime.ts`) para enterarse
 * de que terminó.
 *
 * `use-avaluo-status.ts` es el ANTI-precedente (N8): un `setInterval` que
 * vive y muere con la página, sin techo, sin la advertencia de que no es el
 * mecanismo de finalización. Este hook toma la forma mecánica (sondear
 * mientras el componente esté montado) pero no el rol.
 */

import { useEffect, useState } from 'react'
import { contractsApi, type EstadoDeLote } from '@/lib/api/contracts.service'

/** contrato §11-J9 — frozen, no elegido por este worker. */
const INTERVALO_MS = 3_000
const TECHO_MS = 10 * 60_000

const ESTADOS_TERMINALES = new Set(['LISTO', 'FALLIDO'])

export function useEstadoDeLote(lote: string | null): {
  estado: EstadoDeLote | null
  /** Se llegó al techo de 10 minutos sin LISTO/FALLIDO — dejamos de sondear. */
  agotado: boolean
} {
  const [estado, setEstado] = useState<EstadoDeLote | null>(null)
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
        const r = await contractsApi.migracion.estadoDeLote(lote)
        if (!vigente) return
        setEstado(r)
        // §3.2.A2: un `estado` no reconocido se trata como "seguir
        // esperando", nunca como error — sólo LISTO/FALLIDO detienen el
        // sondeo.
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
