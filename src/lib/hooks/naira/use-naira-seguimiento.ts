'use client'

/**
 * use-naira-seguimiento.ts — la lectura de la pestaña Seguimiento de Naira (Fase 13, plan 13-04; D13-4, UI-SPEC §8.2 y
 * §8.5): `GET …/naira/open-loops` sobre el hook BASE de 13-01 (`useLecturaDeNaira`), con la agencia de `useAuth`.
 *
 * Dos usos:
 *   · lectura PRINCIPAL de la pestaña (`habilitada` por defecto): refresca al VOLVER a la pestaña con el hook existente
 *     `useRefetchOnVisible` (visibilitychange → visible) y NO hace polling;
 *   · lectura SECUNDARIA del detalle de una señal (`habilitada = canAccess('naira', 'open-loops-view')`): sin la acción, `leer`
 *     es `null` y la base devuelve `sin_permiso` SIN tocar la red (y el refresco al volver no llama a nada).
 *
 * El estado lo REEMPLAZA entero la base: un 403 después de un 200 deja exactamente `sin_permiso`, sin la lista anterior
 * (el antipatrón medido es use-piloto-briefing.ts:59-61, que guarda el error y deja los datos viejos). No persiste nada.
 */

import { leerSeguimiento } from '@/lib/api/naira/cliente'
import type { NairaOpenLoopsList } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaSeguimiento(habilitada = true): {
  readonly estado: LecturaDeNaira<NairaOpenLoopsList>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  const lectura = useLecturaDeNaira<NairaOpenLoopsList>(habilitada ? () => leerSeguimiento(agencyId ?? '') : null, [])
  useRefetchOnVisible(lectura.recargar, true)
  return lectura
}
