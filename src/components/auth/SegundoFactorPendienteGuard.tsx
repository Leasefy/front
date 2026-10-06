'use client'

/**
 * Pantallas sin ProtectedRoute que igual son «adentro»: el selector de perfil
 * y los onboardings de inquilino y propietario. Si la sesión tiene un segundo
 * factor y todavía no dio el código (`mfaRequired`), primero el código; el
 * destino viaja con él.
 *
 * 🔴 QA 01-10-2026: «se ingresó sin haber pedido el token». El panel lo
 * atajaba su ProtectedRoute; estas pantallas no tenían ningún guardia, así
 * que una sesión abierta con la contraseña y sin el código entraba.
 *
 * Sin sesión deja pasar: el onboarding también se ve sin cuenta.
 *
 * Nico, 02-10-2026: con sesión, si todavía no se sabe si falta el código
 * (`mfaCheckStatus` `pending`) se espera con el cargador, y si la consulta no
 * respondió ni reintentando (`failed`), «No pudimos confirmar tu sesión» con
 * «Reintentar». Nunca se deja ver la pantalla sin verificar.
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/lib/auth/use-auth'
import { rutaAlSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { NoPudimosConfirmarTuSesion } from './NoPudimosConfirmarTuSesion'

export function SegundoFactorPendienteGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, mfaRequired, mfaCheckStatus } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const falta = !isLoading && isAuthenticated && mfaRequired

  useEffect(() => {
    if (!falta) return
    // La consulta se lee acá y no con `useSearchParams`: en un layout, ese
    // hook obliga a un límite de Suspense para el build estático.
    const aqui = `${pathname ?? '/'}${typeof window === 'undefined' ? '' : window.location.search}`
    router.replace(rutaAlSegundoFactor(aqui))
  }, [falta, pathname, router])

  if (isAuthenticated && mfaCheckStatus === 'failed') return <NoPudimosConfirmarTuSesion />
  if (falta || (isAuthenticated && mfaCheckStatus === 'pending')) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <CargaDeMarca tamano="lg" />
      </div>
    )
  }
  return <>{children}</>
}
