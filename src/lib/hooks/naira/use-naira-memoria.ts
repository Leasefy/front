'use client'

/**
 * use-naira-memoria.ts — la lectura de la pestaña «Qué cree Naira» (Fase 13, plan 13-07): `GET …/naira/memory` sobre el
 * hook BASE de 13-01 (`useLecturaDeNaira`).
 *
 * El estado lo REEMPLAZA entero la base: un 403 no deja la vista anterior (ANTI `use-piloto-briefing.ts:59-61`). Refresca al
 * volver a la pestaña con `useRefetchOnVisible` (UI-SPEC §8.5) y NO hace polling. Su `recargar` también lo llama la vista
 * después de escribir.
 */

import { leerMemoria } from '@/lib/api/naira/cliente'
import type { NairaMemoryView } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaMemoria(): {
  readonly estado: LecturaDeNaira<NairaMemoryView>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  const lectura = useLecturaDeNaira<NairaMemoryView>(() => leerMemoria(agencyId ?? ''), [])
  useRefetchOnVisible(lectura.recargar, true)
  return lectura
}
