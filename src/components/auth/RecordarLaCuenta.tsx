'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import {
  cuentaEnPantalla,
  guardarCuenta,
  leerCuentaGuardada,
  portalDeLaRuta,
  tieneElPapelDeLaRuta,
  tieneVariasCuentas,
} from '@/lib/auth/cuenta-activa'

/**
 * «Al entrar, a la última cuenta que usó» (Nico, 21-10-2026): cada vez que la
 * persona está en un portal suyo, ésa queda como su última cuenta. No pinta
 * nada. Sólo para quien tiene más de una cuenta.
 */
export function RecordarLaCuenta() {
  const pathname = usePathname()
  const { user, cuentas } = useAuth()
  useEffect(() => {
    if (!user?.id || !cuentas || !tieneVariasCuentas(cuentas)) return
    if (!portalDeLaRuta(pathname) || !tieneElPapelDeLaRuta(pathname, cuentas)) return
    const cuenta = cuentaEnPantalla(pathname, cuentas, leerCuentaGuardada(user.id))
    if (cuenta) guardarCuenta(user.id, cuenta)
  }, [pathname, user?.id, cuentas])
  return null
}
