'use client'

/**
 * Cuántas veces la persona intentó «Continuar» sin tener el paso completo.
 *
 * Antes el paso pintaba un aviso amarillo fijo («Ingresa tu nombre para
 * continuar») desde que se abría, y con el botón apagado: se sentía como un
 * error sin haber hecho nada (Nico, 30-09). Ahora «Continuar» siempre se puede
 * tocar; si falta algo, el marco no avanza —la validación es la misma de
 * siempre, `canProceed` del contexto— y sube este contador. El paso lo lee para
 * mostrar el error en el campo que falta y llevar el foco ahí.
 *
 * Es un contador y no un booleano para que cada intento vuelva a llevar el
 * foco al campo, aunque el error ya estuviera a la vista.
 *
 * Sin proveedor arriba (las pruebas de cada paso) vale 0: nunca hay error
 * antes de tiempo.
 */

import { createContext, useContext } from 'react'

export const IntentoDeAvanzarContext = createContext<number>(0)

export function useIntentosDeAvanzar(): number {
  return useContext(IntentoDeAvanzarContext)
}
