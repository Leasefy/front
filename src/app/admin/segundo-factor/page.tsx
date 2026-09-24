'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect'
import { Wordmark } from '@/components/admin/Wordmark'
import { MfaSetupSection } from '@/components/settings/MfaSetupSection'

/**
 * /admin/segundo-factor — 🔴 el panel de administración exige segundo factor
 * (auditoría de seguridad, 23-09-2026).
 *
 * Se llega acá cuando el back responde 403 `SEGUNDO_FACTOR_REQUERIDO`: el
 * correo está en `ADMIN_EMAILS` pero la sesión es de sólo-enlace (`aal1`). Dos
 * salidas, según lo que la persona tenga:
 *
 *   · ya tiene un factor TOTP → escribe el código y la sesión sube a `aal2`;
 *   · no tiene ninguno → lo inscribe ACÁ MISMO (el mismo `MfaSetupSection` de
 *     Configuración → Seguridad) y enseguida escribe el primer código. Sin esta
 *     segunda salida el candado se cerraría con la llave adentro: el panel no
 *     tiene otra pantalla a la que mandarlo.
 *
 * Vive FUERA del grupo `(panel)`, igual que login/callback/forbidden: el guard
 * de ese grupo es justamente el que manda acá.
 *
 * Como el callback, NUNCA llama `getSession()` (se cuelga con el AuthProvider a
 * mitad de su propio manejador): la sesión sale del primer `onAuthStateChange`.
 * Los factores se leen por HTTP (`GET /auth/v1/user`) por el mismo candado del
 * SDK que documenta `MfaSetupSection`. El código sí va por el SDK
 * (`mfa.challenge` + `mfa.verify`): es lo que deja la sesión guardada en `aal2`
 * para el panel, igual que `/auth/mfa-verify`.
 */
export default function AdminSegundoFactorPage() {
  return (
    <Suspense fallback={<Marco><Estado texto="verificando sesión" /></Marco>}>
      <SegundoFactor />
    </Suspense>
  )
}

/** Cuánto se espera a Supabase antes de decir que no respondió. */
const TOPE_MS = 15000

function conTope<T>(promesa: Promise<T>): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, rechazar) =>
      setTimeout(() => rechazar(new Error('Supabase no respondió a tiempo. Intenta de nuevo.')), TOPE_MS),
    ),
  ])
}

type Paso = 'cargando' | 'codigo' | 'inscribir' | 'error'

function SegundoFactor() {
  const sp = useSearchParams()
  // Sólo destinos dentro de /admin: `next` viene de la URL y termina en
  // `window.location.href` (mismo saneo que el callback).
  const crudo = sanitizeReturnUrl(sp.get('next'), '/admin')
  const next = crudo.startsWith('/admin') ? crudo : '/admin'

  const [paso, setPaso] = useState<Paso>('cargando')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [recienActivado, setRecienActivado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useRef<string | null>(null)

  const cargarFactores = useCallback(async (accessToken: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    try {
      if (!url || !anonKey) throw new Error('Falta la configuración de Supabase.')
      const res = await conTope(
        fetch(`${url}/auth/v1/user`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        }),
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const usuario = (await res.json()) as {
        factors?: Array<{ id: string; factor_type: string; status: string }>
      }
      const totp = usuario.factors?.find((f) => f.factor_type === 'totp' && f.status === 'verified')
      if (totp) {
        setFactorId(totp.id)
        setPaso('codigo')
      } else {
        setPaso('inscribir')
      }
    } catch {
      // Si ni siquiera se pudo preguntar, se ofrece inscribirlo: de las dos
      // salidas es la única que sirve sin saber (quien ya tenía uno inscribe
      // otro, y con cualquiera de los dos pasa).
      setPaso('inscribir')
    }
  }, [])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setError('Supabase no configurado.')
      setPaso('error')
      return
    }
    let primero = true
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_evento, sesion) => {
      token.current = sesion?.access_token ?? null
      if (!primero) return
      primero = false
      if (!sesion) {
        window.location.href = `/admin/login?next=${encodeURIComponent(next)}`
        return
      }
      void cargarFactores(sesion.access_token)
    })
    return () => subscription.unsubscribe()
  }, [cargarFactores, next])

  async function verificar() {
    const sb = getSupabase()
    if (!sb || !factorId || codigo.length !== 6) return
    setVerificando(true)
    setError(null)
    try {
      const { data: desafio, error: errorDelDesafio } = await conTope(sb.auth.mfa.challenge({ factorId }))
      if (errorDelDesafio) throw errorDelDesafio
      const { error: errorDelCodigo } = await conTope(
        sb.auth.mfa.verify({ factorId, challengeId: desafio.id, code: codigo }),
      )
      if (errorDelCodigo) throw errorDelCodigo
      // Recarga entera: el guard del panel lee la sesión nueva (aal2) al montar.
      window.location.href = next
    } catch (err) {
      const msg = (err as Error).message || ''
      setError(
        /invalid|expired/i.test(msg)
          ? 'Código incorrecto. El código cambia cada 30 segundos: espera al siguiente.'
          : msg || 'No se pudo verificar el código.',
      )
      setCodigo('')
    } finally {
      setVerificando(false)
    }
  }

  async function cerrarSesion() {
    await getSupabase()?.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <Marco>
      <div className="section-label justify-center mb-3">segundo factor</div>
      <h1 className="font-display text-display tracking-tight mb-2 text-fg">
        {paso === 'inscribir' ? 'Activa tu segundo factor' : 'Escribe tu código'}
      </h1>
      <p className="text-sm text-fg-muted mb-8">
        {paso === 'inscribir'
          ? 'Este panel ve los datos de todas las inmobiliarias: entrar con el enlace del correo no alcanza. Actívalo una vez con tu app de autenticación.'
          : recienActivado
            ? 'Ya quedó activado. Para entrar, escribe el código que muestra AHORA tu app (si es el mismo que acabas de usar, espera al siguiente).'
            : 'Este panel exige segundo factor. Abre tu app de autenticación y escribe el código de seis dígitos.'}
      </p>

      {paso === 'cargando' ? <Estado texto="revisando tu segundo factor" /> : null}

      {paso === 'inscribir' ? (
        <div className="text-left" data-testid="inscribir-segundo-factor-admin">
          <MfaSetupSection
            onActivado={(id) => {
              setFactorId(id)
              setRecienActivado(true)
              setPaso('codigo')
            }}
          />
        </div>
      ) : null}

      {paso === 'codigo' ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void verificar()
          }}
        >
          <input
            aria-label="Código de verificación de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.replace(/\D/g, ''))
              if (error) setError(null)
            }}
            className="w-full border border-border bg-bg px-3 py-2 text-center font-mono text-2xl tracking-[0.3em] text-fg"
            data-testid="codigo-segundo-factor-admin"
          />
          <button type="submit" className="btn w-full" disabled={verificando || codigo.length !== 6}>
            {verificando ? 'Verificando…' : 'Entrar →'}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void cerrarSesion()}
        className="mt-8 text-sm text-fg-muted underline-offset-4 hover:underline"
      >
        Cerrar sesión
      </button>
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Wordmark size="md" variant="blue" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">admin</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Estado({ texto }: { texto: string }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 text-fg-muted">
      <span className="inline-block w-2 h-2 bg-brand animate-pulse" />
      {texto}
    </div>
  )
}
