'use client'

/**
 * Qué inmuebles del portafolio están publicados en el marketplace, y publicar
 * o quitar uno o varios desde la tabla de Inmuebles (Nico, 10-10-2026: «en
 * las opciones debería tener la opción de subir al marketplace o quitarlo»,
 * «y que sea masiva también»).
 *
 * `porInmueble` es `null` sin la migración o si no se pudo leer: entonces la
 * tabla no ofrece nada de esto (no hay una marca que cambiar). Los conteos y
 * el porqué los manda el back, igual que en «¿Cuáles publicas?».
 */

import { useCallback, useEffect, useState } from 'react'

import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type InmuebleParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'

export function usePublicacionEnElMarketplace() {
  const [porInmueble, setPorInmueble] = useState<Record<string, InmuebleParaElegir> | null>(null)
  const [cambiando, setCambiando] = useState(false)
  /** Sube cada vez que algo cambió: quien muestre conteos aparte relee. */
  const [version, setVersion] = useState(0)

  const leer = useCallback(async () => {
    try {
      const l = await marketplaceDelPortafolioApi.lista()
      setPorInmueble(l.disponible ? Object.fromEntries(l.inmuebles.map((i) => [i.id, i])) : null)
    } catch {
      // Sin la lista, la tabla sigue igual: sólo no ofrece publicar ni quitar.
      setPorInmueble(null)
    }
  }, [])

  useEffect(() => {
    void leer()
  }, [leer])

  /** Lo cambió otra parte de la pantalla (el diálogo «¿Cuáles publicas?»). */
  const recargar = useCallback(() => {
    void leer()
  }, [leer])

  /** Publica o quita los inmuebles. `true` si se guardó. */
  const cambiar = useCallback(
    async (propertyIds: readonly string[], publicar: boolean): Promise<boolean> => {
      if (propertyIds.length === 0) return false
      setCambiando(true)
      try {
        const r = await marketplaceDelPortafolioApi.cambiar({ publicar, propertyIds: [...propertyIds] })
        const l = await marketplaceDelPortafolioApi.lista().catch(() => null)
        if (l) setPorInmueble(l.disponible ? Object.fromEntries(l.inmuebles.map((i) => [i.id, i])) : null)
        // Uno solo que quedó publicado pero no sale: se dice por qué, como en la ficha.
        const uno = propertyIds.length === 1 ? l?.inmuebles.find((i) => i.id === propertyIds[0]) : undefined
        const porQue =
          publicar && uno && uno.publicado && !uno.seVe && uno.porQueNoSeVe
            ? `Todavía no sale: ${uno.porQueNoSeVe.replace(/^./, (c) => c.toLowerCase())}`
            : undefined
        toast.success(fraseDelCambio(r), porQue ? { description: porQue } : undefined)
        setVersion((v) => v + 1)
        return true
      } catch (e) {
        toast.error('No se pudo guardar', { description: mensajeParaLaPersona(e) })
        return false
      } finally {
        setCambiando(false)
      }
    },
    [],
  )

  return { porInmueble, cambiar, cambiando, recargar, version }
}
