'use client'

/**
 * Confirmar el correo del registro: el enlace del correo llega acá (vía
 * `/auth/callback`) con un `token_hash`, y la cuenta se confirma con un clic.
 *
 * ── Por qué así (bug de QA, 28-09) ──────────────────────────────────────────
 *
 * El enlace viejo (`{{ .ConfirmationURL }}`) gastaba el token en el GET y
 * volvía con un `code` de PKCE que sólo se canjea en el navegador del
 * registro. Resultado: abierto en otro navegador, cuenta confirmada y sin
 * sesión; abierto dos veces (el escáner de enlaces del correo, un doble clic,
 * recargar una pestaña lenta), «El enlace ya venció» con la cuenta
 * confirmada. Ver `src/lib/auth/regreso-del-correo.ts`.
 *
 * Acá: abrir la página no gasta nada —el escáner la abre y se va—; el clic en
 * «Confirmar mi correo» llama a `verifyOtp({ token_hash })`, que abre la sesión
 * en ESTE navegador, sea cual sea.
 *
 * Igual que `/auth/enlace`: **nunca `getSession()` acá** (se traba con el
 * `onAuthStateChange` del AuthProvider). La sesión que ya hubiera se conoce
 * por el `INITIAL_SESSION` de la suscripción.
 */

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol'
import { Button } from '@/components/ui/button'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils'
import { DESTINO_POR_DEFECTO, tipoDeConfirmacion } from '@/lib/auth/regreso-del-correo'

type Estado = 'listo' | 'confirmando' | 'confirmado' | 'ya-confirmado' | 'gastado' | 'fallo' | 'incompleto'

/** Supabase contesta `otp_expired` (403) tanto si el token venció como si ya se usó. */
function esEnlaceGastado(error: unknown): boolean {
  const e = error as { code?: string; status?: number; message?: string } | null
  if (!e) return false
  return e.code === 'otp_expired' || e.status === 403 || /invalid or has expired/i.test(e.message ?? '')
}

function ConfirmarContent() {
  const sp = useSearchParams()
  const tokenHash = sp.get('token_hash')
  const tipo = tipoDeConfirmacion(sp.get('type'))
  const destino = sanitizeReturnUrl(sp.get('returnUrl'), DESTINO_POR_DEFECTO)
  const [estado, setEstado] = useState<Estado>(tokenHash ? 'listo' : 'incompleto')
  const sesion = useRef<Session | null>(null)
  const enCurso = useRef(false)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_evento, s) => {
      sesion.current = s
    })
    return () => subscription.unsubscribe()
  }, [])

  const ir = () => {
    window.location.href = destino
  }

  const confirmar = async () => {
    if (enCurso.current || !tokenHash) return
    enCurso.current = true
    setEstado('confirmando')
    const sb = getSupabase()
    if (!sb) {
      enCurso.current = false
      setEstado('fallo')
      return
    }
    try {
      const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      if (!error) {
        setEstado('confirmado')
        ir()
        return
      }
      if (esEnlaceGastado(error)) {
        // Segundo clic en el correo (o recargar): el primero ya confirmó y dejó
        // la sesión abierta en este navegador. No es «vencido».
        if (sesion.current?.user?.email_confirmed_at) {
          setEstado('ya-confirmado')
          ir()
          return
        }
        setEstado('gastado')
        return
      }
      enCurso.current = false
      setEstado('fallo')
    } catch {
      enCurso.current = false
      setEstado('fallo')
    }
  }

  const entrar = `/auth?returnUrl=${encodeURIComponent(destino)}`
  const textos: Record<Estado, { titulo: string; cuerpo: string }> = {
    listo: {
      titulo: 'Confirma tu correo',
      cuerpo: 'Toca el botón para terminar de crear tu cuenta en Leasefy.',
    },
    confirmando: {
      titulo: 'Confirma tu correo',
      cuerpo: 'Toca el botón para terminar de crear tu cuenta en Leasefy.',
    },
    confirmado: { titulo: 'Tu correo quedó confirmado', cuerpo: 'Te llevamos a tu cuenta…' },
    'ya-confirmado': { titulo: 'Tu correo ya quedó confirmado', cuerpo: 'Te llevamos a tu cuenta…' },
    gastado: {
      titulo: 'Este enlace ya no sirve',
      cuerpo:
        'Ya se usó o pasó su tiempo. Si ya confirmaste tu correo, inicia sesión con tu contraseña; si no, al entrar te ofrecemos un enlace nuevo.',
    },
    fallo: {
      titulo: 'No pudimos confirmar tu correo',
      cuerpo: 'Revisa tu conexión e intenta de nuevo. El enlace sigue sirviendo.',
    },
    incompleto: {
      titulo: 'Este enlace está incompleto',
      cuerpo: 'Ábrelo otra vez desde el correo. Si no funciona, entra con tu correo y contraseña y te ofrecemos uno nuevo.',
    },
  }
  const { titulo, cuerpo } = textos[estado]

  return (
    <ForceLightMode>
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="mb-8 flex justify-center">
            <LeasefyLogotype size={24} className="text-fg" title="Leasefy" />
          </div>
          <h1 className="text-xl font-semibold text-fg mb-2">{titulo}</h1>
          <p className="text-sm text-fg-muted mb-6">{cuerpo}</p>

          {(estado === 'listo' || estado === 'confirmando') && (
            <Button
              type="button"
              onClick={confirmar}
              disabled={estado === 'confirmando'}
              className="h-12 w-full rounded-full text-[14px]"
            >
              {estado === 'confirmando' ? 'Confirmando…' : 'Confirmar mi correo'}
            </Button>
          )}
          {estado === 'fallo' && (
            <Button type="button" onClick={confirmar} className="h-12 w-full rounded-full text-[14px]">
              Intentar de nuevo
            </Button>
          )}
          {(estado === 'gastado' || estado === 'incompleto') && (
            <Button asChild className="h-12 w-full rounded-full text-[14px]">
              <a href={entrar}>Ir a iniciar sesión</a>
            </Button>
          )}
        </div>
      </div>
    </ForceLightMode>
  )
}

export default function ConfirmarPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarContent />
    </Suspense>
  )
}
