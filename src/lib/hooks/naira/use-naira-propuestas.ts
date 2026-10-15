'use client'

/**
 * use-naira-propuestas.ts — la lectura de la pestaña Aprobaciones de Naira (`GET …/naira/actions`, Fase 13, plan 13-05),
 * sobre el hook BASE de 13-01.
 *
 * El estado lo REEMPLAZA entero la base: un 403 no deja la lista anterior a la vista (ANTI use-piloto-briefing.ts:59-61).
 * Refresca al volver a la pestaña (useRefetchOnVisible) y no hace polling.
 *
 * NO pide el detalle de ninguna propuesta: el servidor registra que una propuesta se presentó al servir su detalle
 * (D12-13), así que solo lo pide la ficha, cuando la persona la abre (D13-14, FG13-14).
 */

import { leerPropuestas } from '@/lib/api/naira/cliente'
import type { NairaActionsList } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaPropuestas(): {
  readonly estado: LecturaDeNaira<NairaActionsList>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  const lectura = useLecturaDeNaira<NairaActionsList>(() => leerPropuestas(agencyId ?? ''), [])
  useRefetchOnVisible(lectura.recargar, true)
  return lectura
}
