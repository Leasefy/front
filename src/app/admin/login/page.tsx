'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { Wordmark } from '@/components/admin/Wordmark'

/**
 * /admin/login — magic-link (Supabase signInWithOtp). No passwords. The link
 * returns to /admin/auth/callback. `?sent=1` shows the confirmation state.
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
  const next = sp.get('next') ?? undefined
  const urlError = sp.get('error') ?? undefined

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-bg">
      {/* Brand panel (blue + white) */}
      <div className="relative bg-brand text-white overflow-hidden">
        <div className="absolute inset-0 pattern-hash-on-blue opacity-80" />
        <div className="relative z-10 h-full flex flex-col justify-between p-8 md:p-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">admin · v1</div>
          <div className="my-12">
            <Wordmark size="xl" variant="white" className="block" />
            <div className="mt-6 section-label-inverted">real estate · agentic ops</div>
            <p className="mt-8 max-w-sm text-white/80 leading-relaxed">
              Panel interno. Editar prompts del agente, ver llamadas y compliance cross-tenant,
              auditar identidad y cartera.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60 flex items-center justify-between">
            <span>● restringido</span>
            <span>nest.com.co</span>
          </div>
        </div>
      </div>

      {/* Form panel (paper + ink) */}
      <div className="relative flex items-center justify-center p-6 md:p-10 bg-bg">
        <div className="w-full max-w-sm">
          <div className="section-label mb-3">acceso</div>
          <h1 className="font-display text-display tracking-tight mb-1 text-fg">Iniciar sesión</h1>
          <p className="text-sm text-fg-muted mb-8">Magic link al email autorizado. Sin contraseñas.</p>

          {sent ? (
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-2 text-ok font-mono text-[11px] uppercase tracking-[0.12em]">
                <span className="inline-block w-2 h-2 bg-ok" />
                magic link enviado
              </div>
              <p className="text-fg-muted">
                Revisá tu inbox y hacé click en el link para entrar. Podés cerrar esta pestaña.
              </p>
            </div>
          ) : (
            <LoginForm error={urlError} nextPath={next} />
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          <span>+ leasefy · 2026</span>
          <span>panel interno</span>
        </div>
      </div>
    </div>
  )
}

function LoginForm({ error, nextPath }: { error?: string; nextPath?: string }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

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
      setLocalErr((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block mb-1.5 font-mono text-[10px] uppercase tracking-mono-label text-fg-muted">email</span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="vos@leasefy.com"
        />
      </label>
      {(error || localErr) && (
        <div className="font-mono text-[11px] uppercase tracking-mono-label text-bad flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-bad" />
          {localErr ?? error}
        </div>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? 'Enviando' : 'Enviar magic link →'}
      </button>
    </form>
  )
}
