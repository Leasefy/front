'use client'

/**
 * useNairaFicha — «Qué dice Naira de mí» (P3, Nico 15-10-2026): la ficha de quien mira (`userId` null) o la de una persona
 * del equipo que autorizó (dueño, admin y gerente). Refresca al volver a la pestaña.
 */

import { leerFichaDe, leerFichaPropia } from '@/lib/api/naira/cliente'
import type { NairaPersonSheet } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useLecturaDeNaira, type LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaFicha(userId: string | null): {
  readonly estado: LecturaDeNaira<NairaPersonSheet>
  readonly recargar: () => void
} {
  const agencyId = useAuth().agency?.id ?? null
  const lectura = useLecturaDeNaira<NairaPersonSheet>(
    () => (userId === null ? leerFichaPropia(agencyId ?? '') : leerFichaDe(agencyId ?? '', userId)),
    [userId],
  )
  useRefetchOnVisible(lectura.recargar, true)
  return lectura
}
