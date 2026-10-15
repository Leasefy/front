'use client'

/**
 * use-naira-senal.ts — la lectura PRINCIPAL de la ficha de una señal de Naira (Fase 13, plan 13-03; D13-4, P8).
 *
 * Envuelve el hook base (`useLecturaDeNaira`, 13-01), que REEMPLAZA el estado entero: al pasar de una señal a otra, lo
 * de la anterior no queda ni un cuadro (si la nueva da 403, queda solo `sin_permiso`).
 *
 * SIN refetch al volver al foco: lo congelado no cambia (la señal es lo que Naira envió ese día). La lectura depende
 * solo del id de la promoción.
 */

import { leerSenal } from '@/lib/api/naira/cliente'
import type { NairaSignalDetail } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'

import { useLecturaDeNaira, type LecturaDeNaira } from './use-lectura-de-naira'

export function useNairaSenal(promocionId: string): { readonly estado: LecturaDeNaira<NairaSignalDetail>; readonly recargar: () => void } {
  // Sin agencia el hook base queda cargando y no lee: el '' nunca llega a la red.
  const agencyId = useAuth().agency?.id ?? ''
  return useLecturaDeNaira(() => leerSenal(agencyId, promocionId), [promocionId])
}
