'use client'

/**
 * El "Retomar" de MigrarContratos.tsx (N10) era page-local: sólo se veía si
 * ya se había navegado al importador — lo que anula el pedido del owner
 * («cuando el usuario ingrese le muestre qué hace falta»). Este hook lleva
 * ese conteo a un lugar visible siempre (la nav), siguiendo el precedente de
 * `use-postulaciones-pendientes.ts` (N9):
 *
 * - **El número sale del backend, nunca de una constante.** Suma
 *   `pendientes` de cada lote abierto (`GET /contracts/migrar/lotes`), el
 *   mismo dato que ya muestra la tarjeta "Retomar".
 * - **Si falla, no hay indicador.** `undefined`, no `0` — un cero afirmaría
 *   "no queda nada por completar", que es justo lo que no sabemos.
 * - **Cero es cero y se devuelve como tal.** Sin lotes abiertos, `0` sí es
 *   una respuesta real.
 */

import { useCallback, useEffect, useState } from 'react'
import { contractsApi } from '@/lib/api/contracts.service'

/** Cada cuánto se refresca. Cinco minutos, mismo ritmo que postulaciones. */
const REFRESCO_MS = 5 * 60 * 1000

export function useMigracionesPendientes(): { pendientes: number | undefined } {
  // `undefined` = todavía no sabemos, o falló. Las dos se dibujan igual: sin
  // indicador. Es distinto de `0`, que sí es una respuesta.
  const [pendientes, setPendientes] = useState<number | undefined>(undefined)

  const cargar = useCallback(async () => {
    try {
      const lotes = await contractsApi.migracion.lotesAbiertos()
      // Por completar = filas pendientes + contratos ya activados que no
      // cobran (sin inmueble o sin propietario). Un back viejo no manda los
      // dos últimos: `?? 0`, nunca un NaN que apague el badge.
      setPendientes(
        lotes.reduce(
          (total, lote) =>
            total +
            lote.pendientes +
            (lote.activadosSinInmueble ?? 0) +
            (lote.activadosSinPropietario ?? 0),
          0,
        ),
      )
    } catch {
      // Sin dato no se inventa uno.
      setPendientes(undefined)
    }
  }, [])

  useEffect(() => {
    void cargar()
    const id = setInterval(() => void cargar(), REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar])

  return { pendientes }
}
