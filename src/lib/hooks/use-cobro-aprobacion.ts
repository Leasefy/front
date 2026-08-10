'use client'

/**
 * use-cobro-aprobacion — el estado del cobro de la aprobación, compartido por
 * las dos pantallas que lo necesitan.
 *
 * Existe por un problema de navegación, no de datos: la pantalla de pago no
 * tenía **entrada**. Nada en la app enlazaba a ella; la única forma de llegar
 * era escribiendo la URL.
 *
 * La entrada natural es «Mi tope de arriendo», pero enlazar desde ahí sin más
 * mandaría a la gente a un callejón: hoy el backend no tiene la ruta de cobro y
 * la pantalla de pago lo dice. Un botón que lleva a "todavía no se puede" es
 * peor que no tener botón.
 *
 * Con esto, el enlace aparece **solo cuando hay algo que pagar**. El día que
 * Víctor prenda el endpoint, la entrada se enciende sola, sin tocar una línea.
 *
 * Los cuatro estados están separados a propósito: «no existe la ruta» no es lo
 * mismo que «falló la red», y sobre lo primero no se ofrece reintentar.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  estudioPagoApi,
  CobroNoDisponible,
  type EstadoDePagoDelEstudio,
} from '@/lib/api/estudio-pago.service'

export type EstadoDelCobro =
  | { fase: 'cargando' }
  /** El backend todavía no expone el cobro. No es un error: es que no existe. */
  | { fase: 'noDisponible' }
  | { fase: 'fallo'; error: unknown }
  | { fase: 'listo'; cobro: EstadoDePagoDelEstudio }

export interface UseCobroAprobacionResult {
  estado: EstadoDelCobro
  recargar: () => void
  /** Atajo para decidir si mostrar la entrada al pago. */
  hayQuePagar: boolean
}

export function useCobroAprobacion(): UseCobroAprobacionResult {
  const [estado, setEstado] = useState<EstadoDelCobro>({ fase: 'cargando' })

  const cargar = useCallback(async () => {
    setEstado({ fase: 'cargando' })
    try {
      setEstado({ fase: 'listo', cobro: await estudioPagoApi.consultarEstado() })
    } catch (e) {
      setEstado(e instanceof CobroNoDisponible ? { fase: 'noDisponible' } : { fase: 'fallo', error: e })
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return {
    estado,
    recargar: () => void cargar(),
    hayQuePagar: estado.fase === 'listo' && !estado.cobro.pagado,
  }
}
