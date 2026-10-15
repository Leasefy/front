'use client'

/**
 * use-naira-briefing.ts — la lectura PRINCIPAL del Briefing de Naira (Fase 13, plan 13-03; D13-4, UI-SPEC §8.5 y §8.2).
 *
 * Envuelve el hook base (`useLecturaDeNaira`, 13-01), que REEMPLAZA el estado entero: un 403 después de un 200 deja
 * exactamente `{ kind: 'sin_permiso' }`, sin nada de lo que se veía. La misma agencia que el hook base (`useAuth`).
 *
 * Refresca al VOLVER AL FOCO (visibilitychange → visible, sin intervalo): un rol degradado a mitad de sesión tiene que
 * dejar de ver lo que veía la próxima vez que mire la pestaña. El refresco también reemplaza el estado entero (Δ 13-01:
 * si falla, queda su fallo, no lo anterior + un aviso).
 *
 * El día viaja tal cual lo decide la página (`undefined` = el de hoy); cambiar de día es otra lectura.
 */

import { leerBriefing } from '@/lib/api/naira/cliente'
import type { NairaBriefingDay } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

import { useLecturaDeNaira, type LecturaDeNaira } from './use-lectura-de-naira'

export function useNairaBriefing(dia?: string): { readonly estado: LecturaDeNaira<NairaBriefingDay>; readonly recargar: () => void } {
  // Sin agencia el hook base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? ''
  const { estado, recargar } = useLecturaDeNaira(() => leerBriefing(agencyId, dia), [dia ?? ''])
  useRefetchOnVisible(recargar, true)
  return { estado, recargar }
}
