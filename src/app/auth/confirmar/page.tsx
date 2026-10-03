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
import { CrossFade } from '@leasefy/cadence'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import { getSupabase } from '@/lib/supabase/client'
import { useHidratado } from '@/lib/hooks/use-hidratado'
import { sanitizeReturnUrl } from '@/lib/utils'
import { DESTINO_POR_DEFECTO, tipoDeConfirmacion } from '@/lib/auth/regreso-del-correo'
import { leerErrorDeSupabase, mensajeDeSupabase } from '@/lib/auth/errores-de-supabase'

type Estado = 'listo' | 'confirmando' | 'confirmado' | 'ya-confirmado' | 'gastado' | 'fallo' | 'incompleto'

const ESPERA_DE_LA_SESION_MS = 4000

/**
 * Supabase contesta `otp_expired` (403) tanto si el token venció como si ya se
 * usó. Por el código y el status, nunca por el texto en inglés (02-10-2026).
 */
function esEnlaceGastado(error: unknown): boolean {
  if (!error) return false
  const { codigo, status } = leerErrorDeSupabase(error)
  return codigo === 'otp_expired' || status === 403
}

/**
 * Por qué no se pudo, con la regla de oro (02-10-2026). Antes decía «Revisa tu
 * conexión» ante CUALQUIER fallo; ahora la conexión sólo cuando el pedido no
 * salió, y un 5xx dice que falló de nuestro lado. El enlace no se gastó.
 */
function motivoDelFallo(error: unknown): string {
  const motivo = mensajeDeSupabase(error, { porDefecto: 'Algo no salió bien. Intenta de nuevo en un momento.' })
  return `${motivo} El enlace sigue sirviendo.`
}

function ConfirmarContent() {
  const sp = useSearchParams()
  const tokenHash = sp.get('token_hash')
  const tipo = tipoDeConfirmacion(sp.get('type'))
  const destino = sanitizeReturnUrl(sp.get('returnUrl'), DESTINO_POR_DEFECTO)
  const [estado, setEstado] = useState<Estado>(tokenHash ? 'listo' : 'incompleto')
  const [motivo, setMotivo] = useState<string | null>(null)
  const sesion = useRef<Session | null>(null)
  // Se suelta con el primer evento de auth (el INITIAL_SESSION). Puede llegar
  // DESPUÉS de la respuesta de verifyOtp: el AuthProvider también se suscribe
  // y los eventos pasan por el mismo candado (visto en el navegador headless,
  // 28-09: la sesión estaba y la pantalla decía «ya no sirve»).
  const primeraSesion = useRef<{ promesa: Promise<void>; soltar: () => void } | null>(null)
  if (primeraSesion.current === null) {
    let soltar = () => {}
    const promesa = new Promise<void>((r) => {
      soltar = r
    })
    primeraSesion.current = { promesa, soltar }
  }
  const enCurso = useRef(false)
  // El HTML del servidor llega antes que React: un clic en ese hueco no hace
  // nada y la persona cree que el botón no sirve. Apagado hasta hidratar, como
  // los formularios de acceso (`use-hidratado.ts`).
  const hidratado = useHidratado()

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_evento, s) => {
      sesion.current = s
      primeraSesion.current?.soltar()
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
      setMotivo(motivoDelFallo(null))
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
        // la sesión abierta en este navegador. No es «vencido». Antes de
        // decidir, se espera a saber si hay sesión (hasta 4 s).
        await Promise.race([
          primeraSesion.current?.promesa,
          new Promise((r) => setTimeout(r, ESPERA_DE_LA_SESION_MS)),
        ])
        if (sesion.current?.user?.email_confirmed_at) {
          setEstado('ya-confirmado')
          ir()
          return
        }
        setEstado('gastado')
        return
      }
      enCurso.current = false
      setMotivo(motivoDelFallo(error))
      setEstado('fallo')
    } catch (e) {
      enCurso.current = false
      setMotivo(motivoDelFallo(e))
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
      cuerpo: motivo ?? motivoDelFallo(null),
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
          {/* Lo que dice la pantalla cambia con el resultado (listo → falló, ya
              usado…): título, texto y botón se cruzan juntos. «Confirmando…»
              es el mismo estado que «listo» (sólo cambia el botón). */}
          <CrossFade swapKey={estado === 'confirmando' ? 'listo' : estado}>
          <h1 className="text-xl font-semibold text-fg mb-2">{titulo}</h1>
          <p className="text-sm text-fg-muted mb-6" role={estado === 'fallo' ? 'alert' : undefined}>
            {cuerpo}
          </p>

          {(estado === 'listo' || estado === 'confirmando') && (
            <Button
              type="button"
              onClick={confirmar}
              disabled={estado === 'confirmando' || !hidratado}
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
          </CrossFade>
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
