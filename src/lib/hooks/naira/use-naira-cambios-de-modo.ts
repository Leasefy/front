'use client'

/**
 * use-naira-cambios-de-modo.ts — las propuestas de Naira de cambiar el modo de un agente (paso 2, Nico 18-10-2026), para
 * la pestaña Aprobaciones. Refresca al volver a la pestaña; sin agencia o sin permiso no pide nada.
 */

import { useCallback, useEffect, useState } from 'react'

import { leerCambiosDeModo, type LecturaDeCambios } from '@/lib/api/naira/cambios-de-modo'
import { useAuth } from '@/lib/auth'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaCambiosDeModo(habilitado: boolean): {
  readonly estado: LecturaDeCambios | { readonly kind: 'cargando' }
  readonly recargar: () => void
} {
  const agencyId = useAuth().agency?.id ?? null
  const [estado, setEstado] = useState<LecturaDeCambios | { readonly kind: 'cargando' }>({ kind: 'cargando' })
  const [vuelta, setVuelta] = useState(0)
  const recargar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    if (!habilitado || agencyId === null) return
    let vigente = true
    void leerCambiosDeModo(agencyId).then((r) => {
      if (vigente) setEstado(r)
    })
    return () => {
      vigente = false
    }
  }, [agencyId, habilitado, vuelta])

  useRefetchOnVisible(recargar, habilitado)
  return { estado, recargar }
}
