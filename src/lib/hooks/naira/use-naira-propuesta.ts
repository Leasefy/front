'use client'

/**
 * use-naira-propuesta.ts — la lectura de la FICHA de una propuesta de Naira (`GET …/naira/actions/{proposalId}`, Fase 13,
 * plan 13-05), sobre el hook BASE de 13-01.
 *
 * El servidor registra que la propuesta se presentó al servirla (D12-13): por eso se pide SOLO al montar la ficha y al
 * cambiar de propuesta (otra propuesta ⇒ `cargando`, sin mostrar la anterior). No refresca al volver al foco ni por
 * intervalo: la huella que la persona vio no puede cambiar debajo suyo (UI-SPEC §7.6/§8.5, D13-14). `recargar()` solo lo
 * disparan «Actualizar propuesta» y «Cargar la versión actual».
 */

import { leerPropuesta } from '@/lib/api/naira/cliente'
import type { NairaActionDetail } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'

export function useNairaPropuesta(proposalId: string): {
  readonly estado: LecturaDeNaira<NairaActionDetail>
  readonly recargar: () => void
} {
  // Sin agencia la base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? null
  return useLecturaDeNaira<NairaActionDetail>(() => leerPropuesta(agencyId ?? '', proposalId), [proposalId])
}
