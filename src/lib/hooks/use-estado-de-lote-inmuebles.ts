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
import { ApiError, asegurarSesionVigente } from '@/lib/api/client'
import { inmueblesImportacionApi, type EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service'

export const INTERVALO_MS = 3_000
/**
 * T-0130 — tras el primer minuto se sondea más espaciado: la revisión de un
 * lote grande son varios minutos y no hace falta preguntar cada 3 s.
 */
export const INTERVALO_LENTO_MS = 8_000
/** T-0130 — subió de 10 a 30 minutos: la revisión de un lote grande tarda. */
export const TECHO_MS = 30 * 60_000

const ESTADOS_TERMINALES = new Set(['LISTO', 'FALLIDO'])

export function useEstadoDeLoteInmuebles(
  lote: string | null,
  /**
   * T-0130 — cambiarlo reinicia el sondeo (y su techo). Lo usa la pantalla al
   * terminar de ubicar las direcciones: el servidor encola la revisión y hay
   * que volver a mirarlo aunque el sondeo anterior ya se hubiera agotado.
   */
  reinicio: number = 0,
): {
  estado: EstadoDeLoteInmuebles | null
  /** Se llegó al techo (`TECHO_MS`, 30 minutos) sin LISTO/FALLIDO — dejamos de sondear. */
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
        // Un sondeo largo cruza renovaciones del token: se renueva antes de preguntar.
        await asegurarSesionVigente()
        const r = await inmueblesImportacionApi.estadoDeLote(lote)
        if (!vigente) return
        setEstado(r)
        // Un `estado` no reconocido se trata como "seguir esperando", nunca
        // como error — sólo LISTO/FALLIDO detienen el sondeo.
        if (ESTADOS_TERMINALES.has(r.estado)) return
      } catch (e) {
        // Sesión terminada: no hay a quién preguntarle. Se deja de sondear; al
        // volver a entrar, la tarjeta de «carga a medias» lee el lote del servidor.
        if (e instanceof ApiError && e.status === 401 && e.code === 'SESSION_TERMINATED') return
        // Error transitorio del sondeo — no es el mecanismo de
        // finalización, así que seguimos intentando hasta el techo en vez
        // de mostrar un error.
      }
      if (!vigente) return
      if (Date.now() - inicio >= TECHO_MS) {
        setAgotado(true)
        return
      }
      const espera = Date.now() - inicio < 60_000 ? INTERVALO_MS : INTERVALO_LENTO_MS
      timeoutId = setTimeout(() => void sondear(), espera)
    }

    void sondear()

    return () => {
      vigente = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lote, reinicio])

  return { estado, agotado }
}
