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
import { useAuth } from '@/lib/auth/use-auth'
import { useTf, type Tf } from '@/lib/i18n/use-tf'

const NS = 'inquilino.crearCuenta'

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

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [confirmarCorreo, setConfirmarCorreo] = useState(false)

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (nombre.trim().length < 2) e.nombre = tf(`${NS}.err.nombre`, 'Escribe tu nombre.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = tf(`${NS}.err.email`, 'Escribe un correo válido.')
    // Mínimo de Supabase. Decirlo antes evita un error del servidor que no
    // explica nada.
    if (password.length < 6) e.password = tf(`${NS}.err.password`, 'Mínimo 6 caracteres.')
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function crear(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorGeneral(null)
    if (!validar()) return

    setEnviando(true)
    try {
      const { requiresConfirmation } = await signUpWithEmail(
        email.trim(),
        password,
        `${window.location.origin}/auth/callback?returnUrl=/inquilino/para-ti`,
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
      // Con sesión activa se entra directo a su panel: es lo que vino a buscar.
      router.push('/inquilino/para-ti')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setErrorGeneral(
        /already registered|already exists|User already/i.test(msg)
          ? tf(`${NS}.err.existe`, 'Ya existe una cuenta con este correo. Inicia sesión y tu aprobación te espera adentro.')
          : tf(`${NS}.err.generico`, 'No pudimos crear tu cuenta. Intenta de nuevo.'),
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

        <form onSubmit={crear} className="space-y-5" noValidate>
          <Campo id="nombre" label={tf(`${NS}.nombre`, 'Nombre')} error={errores.nombre}>
            <Input
              id="nombre"
              autoComplete="name"
              placeholder={tf(`${NS}.ph.nombre`, 'Ej: María Restrepo')}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>

          <Campo id="email" label={tf(`${NS}.correo`, 'Correo')} error={errores.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tf(`${NS}.ph.correo`, 'Ej: maria@correo.com')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>

          <Campo id="password" label={tf(`${NS}.password`, 'Contraseña')} error={errores.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={tf(`${NS}.ph.password`, 'Mínimo 6 caracteres')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Campo>

          {errorGeneral && (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{errorGeneral}</p>
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full" isLoading={enviando} disabled={enviando}>
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
              {tf(`${NS}.confirma.parte2`, 'Ábrelo y entras directo a tu catálogo.')}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm text-fg-muted">
            {tf(`${NS}.confirma.guardada`, 'Tu aprobación ya quedó guardada. No tienes que volver a consultarla ni a pagar.')}
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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
