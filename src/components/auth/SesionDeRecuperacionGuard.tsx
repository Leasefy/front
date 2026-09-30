'use client'

/**
 * Cierra la sesión del enlace de recuperación si la persona se fue sin poner
 * la contraseña nueva. El porqué, en `lib/auth/sesion-de-recuperacion.ts`.
 *
 * Se monta UNA vez en el layout raíz, dentro de AuthProvider (como
 * IdleSessionGuard). Cierra con el `signOut` de siempre: sólo esta sesión y
 * revocada en el servidor, nunca las de sus otros dispositivos.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/lib/auth/use-auth'
import {
  borrarMarcaDeRecuperacion,
  hayMarcaDeRecuperacion,
  rutaDeLaRecuperacion,
} from '@/lib/auth/sesion-de-recuperacion'

export function SesionDeRecuperacionGuard() {
  const pathname = usePathname()
  const { isLoading, isAuthenticated, signOut } = useAuth()
  const cerrandoRef = useRef(false)

  useEffect(() => {
    if (isLoading || cerrandoRef.current) return
    if (!hayMarcaDeRecuperacion() || rutaDeLaRecuperacion(pathname)) return
    borrarMarcaDeRecuperacion()
    if (!isAuthenticated) return
    cerrandoRef.current = true
    void signOut().finally(() => {
      cerrandoRef.current = false
    })
  }, [pathname, isLoading, isAuthenticated, signOut])

  return null
}
