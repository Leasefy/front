'use client'

/**
 * Revisora r25 (C8, ronda 26): las tablas de Cobranza abrían en «Todas» aunque
 * hubiera algo esperando a una persona. Ahora (1) abren en la pestaña que pide
 * trabajo cuando tiene algo y (2) el filtro vive en la URL (`?estado=…`), así un
 * enlace abre donde tiene que abrir. Se lee y se escribe con `location` /
 * `history.replaceState` (sin `useSearchParams`, que obliga a un Suspense en
 * cada página).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useEstadoEnLaUrl<V extends string>(validos: readonly V[]) {
  const [deLaUrl, setDeLaUrl] = useState<V | null>(null)
  // `true` en cuanto la persona eligió (o la URL ya traía uno): la pestaña pendiente no se impone después.
  const elegido = useRef(false)
  const validosRef = useRef(validos)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = new URLSearchParams(window.location.search).get('estado')
    if (v && (validosRef.current as readonly string[]).includes(v)) {
      elegido.current = true
      setDeLaUrl(v as V)
    }
  }, [])

  const escribir = useCallback((v: V | null) => {
    elegido.current = true
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (v) url.searchParams.set('estado', v)
    else url.searchParams.delete('estado')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const yaEligio = useCallback(() => elegido.current, [])
  const marcarElegido = useCallback(() => {
    elegido.current = true
  }, [])
  // Estable entre renders: las pantallas lo ponen en las dependencias de sus efectos.
  return useMemo(() => ({ deLaUrl, escribir, yaEligio, marcarElegido }), [deLaUrl, escribir, yaEligio, marcarElegido])
}
