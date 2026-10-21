'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect'
import { ShieldCheck } from '@phosphor-icons/react'
import { CrossFade, Presence, Spinner } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo'
import { MarcoDeAcceso, TituloDeAcceso } from '@/components/admin/acceso/MarcoDeAcceso'
import { MfaSetupSection } from '@/components/settings/MfaSetupSection'
import { leerErrorDeSupabase } from '@/lib/auth/errores-de-supabase'
import { mensajeDeSupabaseAuth } from '@/lib/auth/errores-del-segundo-factor'
import { MENSAJE_DEL_TOPE } from '@/lib/auth/inscripcion-del-segundo-factor'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

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
    <Suspense fallback={<Marco><Estado texto="Verificando tu sesión…" /></Marco>}>
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
      // El mismo texto que `apiDeAuth`: sin nombrar al proveedor (Nico, 02-10-2026).
      setTimeout(() => rechazar(new Error(MENSAJE_DEL_TOPE)), TOPE_MS),
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

  async function verificar(elCodigo: string = codigo) {
    const sb = getSupabase()
    if (!sb || !factorId || elCodigo.length !== 6 || verificando) return
    setVerificando(true)
    setError(null)
    try {
      const { data: desafio, error: errorDelDesafio } = await conTope(sb.auth.mfa.challenge({ factorId }))
      if (errorDelDesafio) throw errorDelDesafio
      const { error: errorDelCodigo } = await conTope(
        sb.auth.mfa.verify({ factorId, challengeId: desafio.id, code: elCodigo }),
      )
      if (errorDelCodigo) throw errorDelCodigo
      // Recarga entera: el guard del panel lee la sesión nueva (aal2) al montar.
      window.location.href = next
    } catch (err) {
      // 02-10-2026 · Por el traductor de Supabase (por código, con la regla de
      // oro): antes, todo lo que no decía «invalid|expired» salía tal cual,
      // en inglés, y un fallo de red decía «Failed to fetch».
      const { status, codigo: codigoDeSupabase } = leerErrorDeSupabase(err)
      setError(
        status !== undefined || codigoDeSupabase
          ? mensajeDeSupabaseAuth({ status, codigo: codigoDeSupabase, mensaje: (err as Error)?.message })
          : mensajeParaLaPersona(err, { porDefecto: 'No se pudo verificar el código.', accion: 'verificar el código' }),
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

  const titulo = paso === 'inscribir' ? 'Activa tu segundo factor' : 'Verificación de seguridad'
  const bajada =
    paso === 'inscribir'
      ? 'El admin ve los datos de todas las inmobiliarias: entrar con el enlace del correo no alcanza. Actívalo una vez con tu app de autenticación.'
      : recienActivado
        ? 'Ya quedó activado. Para entrar, escribe el código que muestra AHORA tu app (si es el mismo que acabas de usar, espera al siguiente).'
        : 'Abre tu app de autenticación y escribe el código de seis dígitos.'

  return (
    <Marco>
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary-soft ring-1 ring-primary/10">
        <ShieldCheck className="h-7 w-7 text-primary" weight="fill" aria-hidden="true" />
      </div>

      <CrossFade swapKey={paso === 'inscribir' ? 'inscribir' : recienActivado ? 'activado' : 'codigo'}>
        <TituloDeAcceso titulo={titulo} bajada={bajada} />
      </CrossFade>

      <CrossFade swapKey={paso}>
        {paso === 'cargando' ? <Estado texto="Revisando tu segundo factor…" /> : null}

        {paso === 'inscribir' ? (
          <div data-testid="inscribir-segundo-factor-admin">
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
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              void verificar()
            }}
          >
            <div data-testid="codigo-segundo-factor-admin">
              <CasillasDeCodigo
                aria-label="Código de verificación de 6 dígitos"
                value={codigo}
                onChange={(valor) => {
                  setCodigo(valor.replace(/\D/g, ''))
                  if (error) setError(null)
                }}
                // Con el sexto dígito entra solo, como en la entrada de la plataforma.
                onCompleto={(completo) => void verificar(completo)}
                hayError={Boolean(error)}
                disabled={verificando}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              isLoading={verificando}
              disabled={verificando || codigo.length !== 6}
              hideArrow
              className="h-12 w-full rounded-full text-[14px]"
            >
              {verificando ? 'Verificando…' : 'Entrar al admin'}
            </Button>
            <p className="text-pretty text-center text-caption text-fg-subtle">
              Cambia cada 30 segundos: si te lo rechaza, espera el siguiente.
            </p>
          </form>
        ) : null}
      </CrossFade>

      <Presence show={Boolean(error)}>
        <p className="text-body-sm text-danger" role="alert">
          {error}
        </p>
      </Presence>

      <div className="border-t border-border-faint pt-5">
        <Button type="button" variant="link" size="sm" hideArrow onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Button>
      </div>
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return <MarcoDeAcceso data-testid="admin-segundo-factor">{children}</MarcoDeAcceso>
}

function Estado({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 text-body-sm text-fg-muted" role="status">
      <Spinner size="sm" />
      <span>{texto}</span>
    </div>
  )
}
