'use client'

import { useState } from 'react'

/** La dirección del `CrossFade` de pasos de Cadence. */
export type DireccionDelPaso = 'forward' | 'backward' | 'up'

/**
 * Hacia dónde se movió la persona en un asistente: «Continuar» hace entrar el
 * paso nuevo por la derecha (`forward`) y volver a un paso hecho, por la
 * izquierda (`backward`). Lo que no es un paso (la carga, un error de la
 * sesión) entra subiendo (`up`).
 *
 * `clave` identifica lo que se ve; `orden` es su lugar en el asistente, o
 * `null` si no es un paso. Se deriva del render anterior con el patrón de
 * React para «lo que había antes» (estado que se corrige durante el render),
 * así el `CrossFade` recibe la dirección en el MISMO render del cambio.
 */
export function useDireccionDelPaso(clave: string, orden: number | null): DireccionDelPaso {
  const [anterior, setAnterior] = useState({ clave, orden })
  const [direccion, setDireccion] = useState<DireccionDelPaso>('up')
  if (clave !== anterior.clave) {
    const nueva: DireccionDelPaso =
      orden === null || anterior.orden === null ? 'up' : orden >= anterior.orden ? 'forward' : 'backward'
    setDireccion(nueva)
    setAnterior({ clave, orden })
    return nueva
  }
  return direccion
}
