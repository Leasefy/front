'use client'

/**
 * OrigenDeNaira — de dónde salen los datos del `ok` que se está pintando: del agente o de los ejemplos (Fase 13,
 * plan 13-02; D13-6).
 *
 * `VistaDeNaira` lo provee en TODO `ok` con el `origen` que trajo el cliente (13-01), y las primitivas (la marca de
 * corte, el enlace a la fuente, la cifra, los botones de utilidad) lo leen sin que cada superficie lo tenga que
 * enhebrar por props. Así ninguna primitiva pinta un ejemplo como si fuera medido: el corte dice «DATO DE EJEMPLO», el
 * enlace queda inactivo y los votos no se mandan.
 *
 * Sin proveedor el valor es `'agente'` (P4, riesgo aceptado y declarado): una primitiva montada FUERA de una
 * `VistaDeNaira` leería `'agente'`. Lo mitigan las tres capas de UI-SPEC §8.6 (los ejemplos son del año 2000 y dicen
 * «(ejemplo)» en todo texto libre) y la regla del contrato: toda lectura principal de Naira se pinta con `VistaDeNaira`.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { JSX } from 'react'

export type OrigenDeLosDatos = 'agente' | 'ejemplo'

const ContextoDeOrigen = createContext<OrigenDeLosDatos>('agente')

export function ProveedorDeOrigen({
  origen,
  children,
}: {
  readonly origen: OrigenDeLosDatos
  readonly children: ReactNode
}): JSX.Element {
  return <ContextoDeOrigen.Provider value={origen}>{children}</ContextoDeOrigen.Provider>
}

/** El origen del `ok` que envuelve a quien lo llama; sin proveedor, `'agente'` (P4). */
export function useOrigenDeNaira(): OrigenDeLosDatos {
  return useContext(ContextoDeOrigen)
}
