'use client'

/**
 * CrearCuentaDesdeAprobacion — la puerta de entrada a la plataforma.
 *
 * Antes, quien se aprobaba sin cuenta salía al catálogo **público**: el mismo
 * que ve cualquiera, con el navbar de "Registrarme". Su aprobación quedaba
 * viviendo en un `localStorage` que nadie más iba a ver, y el recorrido moría
 * ahí. El premio se entregaba afuera de la plataforma.
 *
 * Acá se convierte en una cuenta. Dos reglas:
 *
 * 1. **No se vuelve a pedir lo que ya escribió.** Celular, cédula y ciudad se
 *    muestran como ya resueltos, no como campos vacíos. Solo se pide lo que de
 *    verdad falta para crear la cuenta: nombre, correo y contraseña.
 * 2. **Lo que ya conocemos no se pierde**: viaja en `user_metadata` del registro.
 *
 * Si Supabase pide confirmar el correo no se puede entrar de una — y eso se
 * dice, no se simula. La aprobación sigue guardada, así que cuando confirme y
 * entre, su catálogo ya está personalizado.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, EnvelopeSimple } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MedidorDeContrasena } from '@/components/auth/MedidorDeContrasena'
import { normalizarCorreo, validarCorreo } from '@/lib/auth/correo'
import { fortalezaDeContrasena } from '@/lib/auth/fortaleza-de-contrasena'
import { useAuth } from '@/lib/auth/use-auth'
import { useHidratado } from '@/lib/hooks/use-hidratado'
import { useTf, type Tf } from '@/lib/i18n/use-tf'
import { urlDeRegresoDelRegistro } from '@/lib/auth/regreso-del-correo'
import { codigoDeSupabase, mensajeDeSupabase } from '@/lib/auth/errores-de-supabase'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

type CampoDeLaCuenta = 'nombre' | 'email' | 'password'

/** Los errores de Supabase que son de UN campo (por su código, nunca por el texto). */
function campoDelErrorDeSupabase(codigo: string | undefined): CampoDeLaCuenta | null {
  if (codigo === 'weak_password') return 'password'
  if (codigo === 'email_address_invalid') return 'email'
  return null
}

/** El foco al primer campo con error: la persona ve dónde está el problema. */
function enfocar(campo: CampoDeLaCuenta | undefined) {
  if (campo) document.getElementById(campo)?.focus()
}

const NS = 'inquilino.crearCuenta'

/**
 * A dónde aterriza la persona después de confirmar (o al instante, si Supabase
 * no exige confirmación).
 *
 * **No es `/inquilino/para-ti` directo, aunque sea lo que quiere ver.** Ese
 * panel está detrás de `ProtectedRoute allowedRoles={['tenant']}`, y recién
 * creada la cuenta el backend todavía no tiene el registro del usuario ni su
 * rol resuelto: el guard la rebota. Es el mismo motivo por el que el registro
 * normal (`AuthForm`) también apunta al onboarding y no a un panel.
 *
 * El onboarding sí sabe llevarla al final a donde iba — le pasamos el destino.
 */
const CATALOGO = '/inquilino/para-ti'
const DESTINO = `/onboarding/inquilino?returnUrl=${encodeURIComponent(CATALOGO)}`

export interface DatosConocidos {
  /** Número nacional, solo dígitos. */
  telefono: string
  cedula: string
  ciudad: string
}

export function CrearCuentaDesdeAprobacion({
  datos,
  onCancelar,
}: {
  datos: DatosConocidos
  onCancelar: () => void
}) {
  const router = useRouter()
  const { signUpWithEmail } = useAuth()
  const tf = useTf()
  // Misma guarda que el login: sin React detrás, un clic enviaría el `<form>`
  // solo. Los campos no llevan `name` (no viajaría nada), pero la guarda no
  // puede depender de eso.
  const hidratado = useHidratado()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaCuenta, string>>>({})
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [confirmarCorreo, setConfirmarCorreo] = useState(false)

  function validar(): boolean {
    const e: Partial<Record<CampoDeLaCuenta, string>> = {}
    if (nombre.trim().length < 2) e.nombre = tf(`${NS}.err.nombre`, 'Escribe tu nombre.')
    const correo = validarCorreo(email)
    if (!correo.ok) e.email = correo.motivo
    // El mismo mínimo que el registro de /auth; el medidor de abajo dice qué
    // le falta (2026-09-07).
    if (!fortalezaDeContrasena(password, { correo: email }).cumpleMinimo) {
      e.password = tf(`${NS}.err.password`, 'Todavía es débil: sigue el consejo de abajo.')
    }
    setErrores(e)
    enfocar((['nombre', 'email', 'password'] as const).find((c) => e[c]))
    return Object.keys(e).length === 0
  }

  /** Lo que la persona corrige deja de estar en rojo. */
  function cambiar(campo: CampoDeLaCuenta, valor: string, poner: (v: string) => void) {
    poner(valor)
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  async function crear(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorGeneral(null)
    if (!validar()) return

    setEnviando(true)
    try {
      const { requiresConfirmation } = await signUpWithEmail(
        normalizarCorreo(email),
        password,
        urlDeRegresoDelRegistro(window.location.origin, DESTINO),
        'tenant',
        {
          full_name: nombre.trim(),
          phone: `+57${datos.telefono}`,
          document_number: datos.cedula,
          city: datos.ciudad,
        },
      )
      if (requiresConfirmation) {
        setConfirmarCorreo(true)
        return
      }
      // Mismo destino que el link de confirmación, por la misma razón.
      router.push(DESTINO)
    } catch (err) {
      // Por el código de Supabase, nunca por el texto en inglés; con la regla
      // de oro: «conexión» sólo sin respuesta, un 5xx es nuestro (02-10-2026).
      const codigo = codigoDeSupabase(err)
      if (codigo === 'user_already_exists' || codigo === 'email_exists') {
        setErrorGeneral(
          tf(`${NS}.err.existe`, 'Ya existe una cuenta con este correo. Inicia sesión y tu aprobación te espera adentro.'),
        )
        return
      }
      const campo = campoDelErrorDeSupabase(codigo)
      if (campo) {
        setErrores((prev) => ({ ...prev, [campo]: mensajeDeSupabase(err) }))
        enfocar(campo)
        return
      }
      setErrorGeneral(
        mensajeDeSupabase(err, {
          porDefecto: tf(`${NS}.err.generico`, 'No pudimos crear tu cuenta. Intenta de nuevo.'),
          accion: 'crear tu cuenta',
        }),
      )
    } finally {
      setEnviando(false)
    }
  }

  if (confirmarCorreo) {
    return <ConfirmaTuCorreo tf={tf} email={email.trim()} />
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-fg leading-tight">
            {tf(`${NS}.titulo`, 'Crea tu cuenta para entrar')}
          </h1>
          <p className="text-sm text-fg-muted mt-1 leading-relaxed">
            {tf(`${NS}.bajada`, 'Tu aprobación queda guardada y adentro te mostramos solo las propiedades que puedes tomar. Te faltan tres datos.')}
          </p>
        </div>

        {/* Lo que ya tenemos, visible: pedirlo otra vez haría sentir que nada de
            lo anterior contó. */}
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-fg mb-2">{tf(`${NS}.yaTenemos`, 'Esto ya lo tenemos')}</p>
          <ul className="space-y-1.5">
            <YaLoTenemos label={tf(`${NS}.celular`, 'Celular')} valor={`+57 ${datos.telefono}`} />
            <YaLoTenemos label={tf(`${NS}.cedula`, 'Cédula')} valor={datos.cedula} />
            <YaLoTenemos label={tf(`${NS}.ciudad`, 'Ciudad')} valor={datos.ciudad} />
          </ul>
        </div>

        <form method="post" onSubmit={crear} className="space-y-5" noValidate>
          <Campo id="nombre" label={tf(`${NS}.nombre`, 'Nombre')} error={errores.nombre}>
            <Input
              id="nombre"
              autoComplete="name"
              placeholder={tf(`${NS}.ph.nombre`, 'Ej: María Restrepo')}
              value={nombre}
              onChange={(e) => cambiar('nombre', e.target.value, setNombre)}
              aria-invalid={errores.nombre ? true : undefined}
              aria-describedby={errores.nombre ? 'nombre-error' : undefined}
            />
          </Campo>

          <Campo id="email" label={tf(`${NS}.correo`, 'Correo')} error={errores.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tf(`${NS}.ph.correo`, 'Ej: maria@correo.com')}
              value={email}
              onChange={(e) => cambiar('email', e.target.value, setEmail)}
              aria-invalid={errores.email ? true : undefined}
              aria-describedby={errores.email ? 'email-error' : undefined}
            />
          </Campo>

          <Campo id="password" label={tf(`${NS}.password`, 'Contraseña')} error={errores.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={tf(`${NS}.ph.password`, 'Mínimo 8 caracteres')}
              value={password}
              onChange={(e) => cambiar('password', e.target.value, setPassword)}
              aria-invalid={errores.password ? true : undefined}
              aria-describedby={errores.password ? 'password-error' : undefined}
            />
            <MedidorDeContrasena contrasena={password} correo={email} className="mt-2" />
          </Campo>

          {errorGeneral && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {errorGeneral}
            </p>
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full" isLoading={enviando} disabled={enviando || !hidratado}>
              {tf(`${NS}.cta`, 'Crear cuenta y ver mi catálogo')}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onCancelar} hideArrow>
              {tf(`${NS}.volver`, 'Volver al resultado')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Cuando Supabase exige confirmar el correo no hay sesión, y por lo tanto no
 * hay panel al que entrar. Se dice tal cual en vez de mandarlo a una pantalla
 * que lo va a rebotar al login.
 */
function ConfirmaTuCorreo({ tf, email }: { tf: Tf; email: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
            <EnvelopeSimple className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-fg leading-tight">
              {tf(`${NS}.confirma.titulo`, 'Confirma tu correo')}
            </h1>
            <p className="text-sm text-fg-muted mt-1 leading-relaxed">
              {tf(`${NS}.confirma.parte1`, 'Te enviamos un enlace a')}{' '}
              <span className="font-medium text-fg">{email}</span>.{' '}
              {tf(
                `${NS}.confirma.parte2`,
                'Ábrelo en este mismo dispositivo, terminas de crear tu perfil y entras a tu catálogo.',
              )}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm text-fg-muted">
            {tf(
              `${NS}.confirma.guardada`,
              'Tu aprobación quedó guardada en este navegador, así que no tienes que volver a consultarla ni a pagar. Si abres el enlace en otro dispositivo, un asesor te la reasocia.',
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function YaLoTenemos({ label, valor }: { label: string; valor: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <CheckCircle className="w-4 h-4 text-success shrink-0" weight="fill" aria-hidden="true" />
      <span className="text-fg-muted">{label}:</span>
      <span className="text-fg">{valor}</span>
    </li>
  )
}

function Campo({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {/* El error entra suave (Cadence `FormError`); el campo lo nombra en `aria-describedby`. */}
      <ErrorDelCampo id={`${id}-error`} mensaje={error} />
    </div>
  )
}
