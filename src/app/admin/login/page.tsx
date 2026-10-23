'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect'
import { mensajeDeSupabase } from '@/lib/auth/errores-de-supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarcoDeAcceso, TituloDeAcceso } from '@/components/admin/acceso/MarcoDeAcceso'

/**
 * /admin/login — entrada al admin de Leasefy con un enlace al correo
 * (Supabase `signInWithOtp`). Sin contraseñas. El enlace vuelve a
 * /admin/auth/callback; `?sent=1` es el «revisa tu correo».
 *
 * Sólo pasan los correos de `ADMIN_EMAILS` (el back los mira en `GET /me`) y
 * después el segundo factor (`/admin/segundo-factor`).
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const sp = useSearchParams()
  const sent = sp.get('sent') === '1'
  // Se sanea acá también (además de en el callback, que es el que navega):
  // así el enlace mágico que se manda por correo nunca lleva un destino ajeno.
  const nextCrudo = sp.get('next')
  const next = nextCrudo ? sanitizeReturnUrl(nextCrudo, '/admin') : undefined
  const urlError = sp.get('error') ?? undefined

  return (
    <MarcoDeAcceso data-testid="admin-login">
      {sent ? <EnlaceEnviado nextPath={next} /> : <LoginForm error={urlError} nextPath={next} />}
    </MarcoDeAcceso>
  )
}

function EnlaceEnviado({ nextPath }: { nextPath?: string }) {
  return (
    <div className="space-y-7" data-testid="admin-login-enviado">
      {/* Glow up 22-10: el ícono suelto, sin su baldosa azul (un solo azul: el botón). */}
      <EnvelopeSimple className="h-9 w-9 text-fg" weight="duotone" aria-hidden="true" />
      <TituloDeAcceso
        titulo="Revisa tu correo"
        bajada="Te mandamos un enlace para entrar. Ábrelo en este mismo navegador; puedes cerrar esta pestaña."
      />
      <Button asChild variant="outline" hideArrow className="h-11 w-full rounded-full text-[14px]">
        <a href={'/admin/login' + (nextPath ? `?next=${encodeURIComponent(nextPath)}` : '')}>Usar otro correo</a>
      </Button>
    </div>
  )
}

function LoginForm({ error, nextPath }: { error?: string; nextPath?: string }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const mensaje = localErr ?? error ?? null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setLocalErr(null)
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('Supabase no configurado')
      const redirectTo =
        `${window.location.origin}/admin/auth/callback` +
        (nextPath ? `?next=${encodeURIComponent(nextPath)}` : '')
      const { error: e2 } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      })
      if (e2) throw e2
      window.location.href = `/admin/login?sent=1` + (nextPath ? `&next=${encodeURIComponent(nextPath)}` : '')
    } catch (err) {
      // 02-10-2026 · Antes, el mensaje de Supabase tal cual, en inglés. Ahora
      // por su traductor: por código, «conexión» sólo sin respuesta.
      setLocalErr(
        mensajeDeSupabase(err, {
          porDefecto: 'No pudimos enviarte el enlace. Prueba de nuevo en un momento.',
          accion: 'enviarte el enlace',
        }),
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-7">
      <TituloDeAcceso
        titulo="Entra al admin"
        bajada="Te mandamos un enlace a tu correo, sin contraseña. Sólo entran las cuentas del equipo de Leasefy."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="admin-correo">Correo</Label>
          <Input
            id="admin-correo"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (localErr) setLocalErr(null)
            }}
            placeholder="tu@leasefy.co"
            aria-invalid={mensaje ? true : undefined}
            aria-describedby={mensaje ? 'admin-correo-error' : undefined}
          />
          <Presence show={Boolean(mensaje)}>
            <p id="admin-correo-error" role="alert" className="flex items-start gap-1.5 pt-1 text-body-sm text-danger">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" aria-hidden="true" />
              <span>{mensaje}</span>
            </p>
          </Presence>
        </div>
        <Button
          type="submit"
          isLoading={submitting}
          disabled={submitting}
          hideArrow
          className="h-12 w-full rounded-full text-[14px]"
        >
          {submitting ? 'Enviando el enlace…' : 'Enviarme el enlace'}
        </Button>
      </form>
      <p className="border-t border-border-faint pt-5 text-caption text-fg-subtle">
        ¿Eres de una inmobiliaria? Entra por{' '}
        <a href="/auth" className="font-medium text-fg underline-offset-4 hover:underline">
          leasefy.co/auth
        </a>
        .
      </p>
    </div>
  )
}
