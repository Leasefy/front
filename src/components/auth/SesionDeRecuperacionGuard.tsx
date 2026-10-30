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
  PERIODO_DEL_LATIDO_MS,
  borrarMarcaDeRecuperacion,
  hayMarcaDeRecuperacion,
  latirRecuperacion,
  recuperacionEnOtraPestana,
  rutaDeLaRecuperacion,
  soltarRecuperacion,
} from '@/lib/auth/sesion-de-recuperacion'

export function SesionDeRecuperacionGuard() {
  const pathname = usePathname()
  const { isLoading, isAuthenticated, signOut } = useAuth()
  const cerrandoRef = useRef(false)

  // Mientras esta pestaña está en la recuperación, avisa a las demás que la
  // sesión se está usando acá (ver `sesion-de-recuperacion.ts`). Va ANTES del
  // efecto de abajo: al irse, el cleanup suelta el latido y el cierre de esta
  // misma pestaña ya no lo encuentra.
  useEffect(() => {
    if (!rutaDeLaRecuperacion(pathname)) return
    latirRecuperacion()
    const id = setInterval(() => latirRecuperacion(), PERIODO_DEL_LATIDO_MS)
    return () => {
      clearInterval(id)
      soltarRecuperacion()
    }
  }, [pathname])

  useEffect(() => {
    if (isLoading || cerrandoRef.current) return
    if (!hayMarcaDeRecuperacion() || rutaDeLaRecuperacion(pathname)) return
    // Otra pestaña está terminando la contraseña con esta misma sesión: cerrarla
    // acá la borraría en Supabase bajo sus pies. No se toca ni la marca.
    if (recuperacionEnOtraPestana()) return
    borrarMarcaDeRecuperacion()
    if (!isAuthenticated) return
    cerrandoRef.current = true
    void signOut().finally(() => {
      cerrandoRef.current = false
    })
  }, [pathname, isLoading, isAuthenticated, signOut])

  return null
}
