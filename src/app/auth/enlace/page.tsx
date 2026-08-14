'use client'

/**
 * El regreso de un enlace de invitación o de recuperación.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * `/auth/callback` es una ruta de SERVIDOR y sólo sabe leer `?code=` (el flujo
 * PKCE que usa Google). Los enlaces de **invitación** de Supabase vuelven por
 * el flujo implícito: el token llega en el **fragmento** (`#access_token=…`),
 * y un fragmento nunca viaja al servidor — el navegador no lo manda.
 *
 * Resultado hasta hoy: un inquilino invitado hacía clic en su correo y caía en
 * `/auth?error=auth_callback_failed`. Como una cuenta invitada **no tiene
 * contraseña**, no había ninguna otra forma de entrar: la invitación se veía
 * enviada y la persona quedaba afuera.
 *
 * El fragmento sobrevive a la redirección (el navegador lo conserva cuando el
 * destino no trae uno propio), así que `/auth/callback` manda acá y este
 * componente deja que `detectSessionInUrl` lo canjee.
 *
 * Mismo patrón que `/admin/auth/callback`, incluida su regla dura: **nunca
 * llamar a `getSession()` acá**, porque el `AuthProvider` del layout corre su
 * propio `onAuthStateChange` al montar y las dos llamadas se traban.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'

import { LeasefyLogo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils'

function EnlaceContent() {
  const sp = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = getSupabase()
    const destino = sanitizeReturnUrl(sp.get('returnUrl'), '/auth/post-login')

    if (!sb) {
      setError('No pudimos verificar el enlace: falta configuración.')
      return
    }

    // Un error explícito viaja en el mismo fragmento (enlace vencido o ya
    // usado). Decirlo es mejor que quedarse girando.
    if (typeof window !== 'undefined' && window.location.hash) {
      const crudo = window.location.hash.replace(/^#/, '')
      const params = new URLSearchParams(crudo)
      const codigo = params.get('error') ?? params.get('error_code')
      if (codigo) {
        setError(
          params.get('error_description') ??
            'El enlace ya no sirve. Pedí que te lo reenvíen.',
        )
        return
      }
    }

    let navegado = false
    const ir = () => {
      if (navegado) return
      navegado = true
      window.location.href = destino
    }

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion) ir()
    })

    const red = setTimeout(() => {
      if (!navegado) {
        setError(
          'No pudimos verificar el enlace. Puede haber vencido o ya haberse usado — pedí que te lo reenvíen.',
        )
      }
    }, 8000)

    return () => {
      clearTimeout(red)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ForceLightMode>
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="flex justify-center mb-8">
            <LeasefyLogo size={28} tone="brand" />
          </div>

          {error ? (
            <>
              <h1 className="text-xl font-semibold text-fg mb-2">
                No pudimos abrir el enlace
              </h1>
              <p className="text-sm text-fg-muted mb-6">{error}</p>
              <Button asChild className="w-full">
                <a href="/auth">
                  Ir a iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-fg mb-2">
                Verificando tu enlace
              </h1>
              <p className="text-sm text-fg-muted">Un segundo…</p>
            </>
          )}
        </div>
      </div>
    </ForceLightMode>
  )
}

export default function EnlacePage() {
  return (
    <Suspense fallback={null}>
      <EnlaceContent />
    </Suspense>
  )
}
