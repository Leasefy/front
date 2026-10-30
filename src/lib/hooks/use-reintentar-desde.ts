'use client'

/**
 * use-reintentar-desde — cooldown gate for the "Reintentar" button (T-0198 §4).
 *
 * Given the ISO instant the back allows the next retry (`error.reintentarDesde`
 * or the `REINTENTO_MUY_PRONTO` 409 body), tells whether the button is still
 * blocked and at what local time it opens. ONE `setTimeout` to that instant —
 * no polling — cleared on unmount / when the instant changes. Absent, null or
 * unparseable → never blocked (current behaviour).
 */

import { useEffect, useState } from 'react'

/** `setTimeout` overflows past ~24.8 days; re-arm in chunks if the instant is further away. */
const MAX_ESPERA_MS = 2 ** 31 - 1

export function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function useReintentarDesde(iso: string | null | undefined): { bloqueado: boolean; hora: string | null } {
  const objetivo = iso ? Date.parse(iso) : Number.NaN
  const valido = Number.isFinite(objetivo)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (!valido) return
    const falta = objetivo - Date.now()
    if (falta <= 0) return
    const id = setTimeout(() => setAhora(Date.now()), Math.min(falta, MAX_ESPERA_MS))
    return () => clearTimeout(id)
  }, [objetivo, valido, ahora])

  const bloqueado = valido && objetivo > Math.max(ahora, Date.now())
  return { bloqueado, hora: valido && iso ? horaLocal(iso) : null }
}
