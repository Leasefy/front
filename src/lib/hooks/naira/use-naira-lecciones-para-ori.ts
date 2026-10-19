'use client'

/**
 * use-naira-lecciones-para-ori.ts — lo que Naira le quiere enseñar a Ori (paso 4, Nico 18-10-2026), para la pestaña
 * Aprobaciones. Refresca al volver a la pestaña; sin agencia o sin permiso no pide nada.
 */

import { useCallback, useEffect, useState } from 'react'

import { leerLeccionesParaOri, type LecturaDeLecciones } from '@/lib/api/naira/lecciones-para-ori'
import { useAuth } from '@/lib/auth'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'

export function useNairaLeccionesParaOri(habilitado: boolean): {
  readonly estado: LecturaDeLecciones | { readonly kind: 'cargando' }
  readonly recargar: () => void
} {
  const agencyId = useAuth().agency?.id ?? null
  const [estado, setEstado] = useState<LecturaDeLecciones | { readonly kind: 'cargando' }>({ kind: 'cargando' })
  const [vuelta, setVuelta] = useState(0)
  const recargar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    if (!habilitado || agencyId === null) return
    let vigente = true
    void leerLeccionesParaOri(agencyId).then((r) => {
      if (vigente) setEstado(r)
    })
    return () => {
      vigente = false
    }
  }, [agencyId, habilitado, vuelta])

  useRefetchOnVisible(recargar, habilitado)
  return { estado, recargar }
}
