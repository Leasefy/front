'use client'

/**
 * use-naira-tareas.ts — la lectura SECUNDARIA de la pestaña Aprobaciones de Naira (`GET …/naira/tasks`, Fase 13, plan
 * 13-05), sobre el hook BASE de 13-01.
 *
 * Con `habilitada = false` (el rol no tiene `task-view`) no toca la red y devuelve `sin_permiso`. Quien la usa pinta SOLO
 * en `ok`: un 403 u otro fallo omite la sección sin rastro (UI-SPEC §8.2). Refresca al volver a la pestaña solo habilitada.
 */

import { leerTareas } from '@/lib/api/naira/cliente'
import type { NairaTasksList } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaTareas(habilitada: boolean): {
  readonly estado: LecturaDeNaira<NairaTasksList>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  const lectura = useLecturaDeNaira<NairaTasksList>(habilitada ? () => leerTareas(agencyId ?? '') : null, [])
  useRefetchOnVisible(lectura.recargar, habilitada)
  return lectura
}
