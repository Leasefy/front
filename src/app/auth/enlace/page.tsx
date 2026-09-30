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
 *
 * ── Confirmar correo: no decir «vencido» cuando no lo está (QA, 28-09) ─────
 *
 *  · `?estado=confirmado`: `/auth/callback` no pudo canjear el `code` de un
 *    enlace del registro (otro navegador, sin el `code_verifier`), pero
 *    Supabase sólo emite ese código DESPUÉS de confirmar la cuenta. Lo cierto
 *    es «Tu correo quedó confirmado: inicia sesión».
 *  · `#error_code=otp_expired`: el token ya se usó (segundo clic, el escáner
 *    del correo, recargar una pestaña lenta) o pasó su tiempo. Si ESTE
 *    navegador ya tiene la sesión —el primer clic la abrió— no hay nada que
 *    arreglar: se sigue al destino. Visto el 28-09 con
 *    `hola+onboarding1@leasefy.co`: confirmada y con sesión, la pantalla decía
 *    «El enlace ya venció».
 */

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol'
import { Button } from '@/components/ui/button'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils'
import { tomarTokensDelFragmento } from '@/lib/auth/credenciales-en-la-url'

type Aviso = { titulo: string; cuerpo: string; boton?: string }

const AVISOS = {
  confirmado: {
    titulo: 'Tu correo quedó confirmado',
    cuerpo: 'Inicia sesión con tu correo y contraseña para seguir.',
    boton: 'Iniciar sesión',
  },
  yaConfirmado: { titulo: 'Tu correo ya quedó confirmado', cuerpo: 'Te llevamos a tu cuenta…' },
  gastado: {
    titulo: 'Este enlace ya no sirve',
    cuerpo:
      'Ya se usó o pasó su tiempo. Si era el de confirmar tu correo y ya lo confirmaste, inicia sesión con tu contraseña; si no, al entrar te ofrecemos uno nuevo.',
    boton: 'Ir a iniciar sesión',
  },
} satisfies Record<string, Aviso>

function EnlaceContent() {
  const sp = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const fragmentoRef = useRef<URLSearchParams | null | undefined>(undefined)
  const destino = sanitizeReturnUrl(sp.get('returnUrl'), '/auth/post-login')

  useEffect(() => {
    const sb = getSupabase()

    if (sp.get('estado') === 'confirmado') {
      setAviso(AVISOS.confirmado)
      return
    }

    if (!sb) {
      setError('No pudimos verificar el enlace: falta configuración.')
      return
    }

    let navegado = false
    const ir = () => {
      if (navegado) return
      navegado = true
      window.location.href = destino
    }

    // Los tokens salen de la barra y del historial ANTES de usarlos (ver
    // `tomarTokensDelFragmento`). En un ref: el efecto corre dos veces en
    // desarrollo (StrictMode) y la segunda ya no encontraría el fragmento.
    if (fragmentoRef.current === undefined) fragmentoRef.current = tomarTokensDelFragmento()
    const params = fragmentoRef.current
    if (params) {

      // Un error explícito viaja en el mismo fragmento (enlace vencido o ya
      // usado). Decirlo es mejor que quedarse girando.
      const codigo = params.get('error_code') ?? params.get('error')
      if (codigo === 'otp_expired') {
        // ¿Este navegador ya tiene la sesión? (el primer clic la abrió). Se
        // sabe por el INITIAL_SESSION de la suscripción, no por getSession().
        let resuelto = false
        const resolver = (sesion: Session | null) => {
          if (resuelto) return
          resuelto = true
          if (sesion?.user?.email_confirmed_at) {
            setAviso(AVISOS.yaConfirmado)
            ir()
          } else {
            setAviso(AVISOS.gastado)
          }
        }
        const {
          data: { subscription },
        } = sb.auth.onAuthStateChange((_evento, sesion) => resolver(sesion))
        const espera = setTimeout(() => resolver(null), 3000)
        return () => {
          resuelto = true
          clearTimeout(espera)
          subscription.unsubscribe()
        }
      }
      if (codigo) {
        // Supabase manda la descripción en inglés; acá se traduce por código y
        // no se muestra la cruda (Nico, 2026-09-07).
        setError(
          'El enlace no es válido. Si era el de confirmar tu correo, entra con tu correo y contraseña y te ofrecemos uno nuevo.',
        )
        return
      }

      // Flujo implícito (invitaciones y enlaces generados desde el admin):
      // los tokens vienen en el fragmento. El cliente está en modo PKCE y a
      // esos NO los canjea solo —auth-js los rechaza como «Not a valid PKCE
      // flow url»—, así que la sesión se abre a mano. Sin esto un enlace
      // válido terminaba en «No pudimos abrir el enlace» a los 8 segundos
      // (visto el 2026-09-07 con un enlace de confirmación del admin).
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        let vigente = true
        const noSePudo = () =>
          setError(
            'No pudimos abrir sesión desde este enlace. Pide que te lo reenvíen, o entra con tu correo y contraseña si ya tienes una.',
          )
        sb.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: fallo }) => {
            if (!vigente) return
            if (fallo) noSePudo()
            else ir()
          })
          .catch(() => {
            if (vigente) noSePudo()
          })
        return () => {
          vigente = false
        }
      }
    }

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion) ir()
    })

    const red = setTimeout(() => {
      if (!navegado) {
        // El enlace de confirmación del registro sólo abre sesión en el
        // navegador donde se creó la cuenta (PKCE). Abierto desde el celular,
        // acá no hay sesión, pero la cuenta SÍ quedó confirmada: decirlo
        // evita que la persona pida otro enlace que va a fallar igual.
        setError(
          'No pudimos abrir sesión desde este enlace. Si estabas confirmando tu correo desde otro dispositivo, la cuenta ya quedó confirmada: inicia sesión con tu contraseña. Si el enlace venció o ya se usó, pide que te lo reenvíen.',
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
          {/* El mismo logotipo que el resto de las pantallas de acceso: el símbolo azul suelto no es la marca (Nico, 2026-09-07). */}
          <div className="mb-8 flex justify-center">
            <LeasefyLogotype size={24} className="text-fg" title="Leasefy" />
          </div>

          {aviso ? (
            <>
              <h1 className="text-xl font-semibold text-fg mb-2">{aviso.titulo}</h1>
              <p className="text-sm text-fg-muted mb-6">{aviso.cuerpo}</p>
              {aviso.boton && (
                <Button asChild className="h-12 w-full rounded-full text-[14px]">
                  <a href={`/auth?returnUrl=${encodeURIComponent(destino)}`}>{aviso.boton}</a>
                </Button>
              )}
            </>
          ) : error ? (
            <>
              <h1 className="text-xl font-semibold text-fg mb-2">
                No pudimos abrir el enlace
              </h1>
              <p className="text-sm text-fg-muted mb-6">{error}</p>
              {/* Sin flecha propia: el Button del producto ya trae la suya y acá salían dos (Nico, 2026-09-07). */}
              <Button asChild className="h-12 w-full rounded-full text-[14px]">
                <a href="/auth">Ir a iniciar sesión</a>
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
