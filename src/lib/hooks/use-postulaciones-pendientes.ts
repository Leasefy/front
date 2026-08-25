'use client'

/**
 * Paso 7 del recorrido: que comercial VEA que hay alguien esperando.
 *
 * Antes esa fila del menú no decía nada: había que entrar a `/postulaciones`
 * para enterarse de que había trabajo. Y antes de eso hubo un «5» escrito a
 * mano que no contaba nada — por eso se había quitado el indicador.
 *
 * Reglas, que son las que hacen que un contador sirva:
 *
 * - **El número sale del backend, nunca de una constante.** `stats.pending` es
 *   el mismo dato que después se ve en la lista; si difirieran, el menú
 *   estaría mintiendo sobre su propia pantalla.
 * - **Si falla, no hay indicador.** No un cero: un cero afirma «no hay nadie
 *   esperando», y eso es justo lo que no sabemos. Ver
 *   `src/lib/errores/clasificar.ts`.
 * - **Cero es cero y tampoco se pinta.** Un globo en cero es ruido.
 */

import { useCallback, useEffect, useState } from 'react'
import { landlordApplicationsApi } from '@/lib/api/applications.service'

/** Cada cuánto se refresca. Cinco minutos: no es una bandeja de chat. */
const REFRESCO_MS = 5 * 60 * 1000

export function usePostulacionesPendientes(): { pendientes: number | undefined } {
  // `undefined` = todavía no sabemos, o falló. Las dos se dibujan igual: sin
  // indicador. Es distinto de `0`, que sí es una respuesta.
  const [pendientes, setPendientes] = useState<number | undefined>(undefined)

  const cargar = useCallback(async () => {
    try {
      const res = await landlordApplicationsApi.getAllCandidates()
      setPendientes(res.stats?.pending ?? undefined)
    } catch {
      // Sin dato no se inventa uno. El menú simplemente no dice nada.
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
