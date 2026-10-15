'use client'

/**
 * use-naira-loop.ts — la lectura de la ficha de UN loop de Naira, su bitácora (Fase 13, plan 13-04; D13-4, P8):
 * `GET …/naira/open-loops/{loopId}` sobre el hook BASE de 13-01 (`useLecturaDeNaira`), con la agencia de `useAuth`.
 *
 * El `loopId` va en las dependencias: abrir otro loop vuelve a `cargando` en el mismo cuadro, sin mostrar el anterior (y
 * si el otro da 403, queda solo `sin_permiso`). NO refresca al volver al foco (UI-SPEC §8.5 no la lista). No persiste nada.
 */

import { leerLoop } from '@/lib/api/naira/cliente'
import type { NairaOpenLoopDetail } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'

export function useNairaLoop(loopId: string): {
  readonly estado: LecturaDeNaira<NairaOpenLoopDetail>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  return useLecturaDeNaira<NairaOpenLoopDetail>(() => leerLoop(agencyId ?? '', loopId), [loopId])
}
