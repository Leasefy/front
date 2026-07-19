'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { Wordmark } from '@/components/admin/Wordmark'

/**
 * /admin/auth/callback — handles BOTH Supabase OTP-return flavors (FRONT.md §3.2):
 *   1. PKCE (`?code=...`)                        → exchangeCodeForSession
 *   2. Implicit (`#access_token=...&refresh=…`)  → setSession
 * Hard-navigates to `next` after the session is set.
 */
export default function AdminAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell><Loading /></CallbackShell>}>
      <CallbackInner />
    </Suspense>
  )
}

function CallbackInner() {
  const sp = useSearchParams()
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const sb = getSupabase()
    const next = sp.get('next') ?? '/admin'

    async function run() {
      if (!sb) {
        setErr('Supabase no configurado.')
        return
      }

      // The SSR browser client auto-exchanges ?code= on init (detectSessionInUrl),
      // racing this page's explicit exchange. getSession() awaits that init; if the
      // session already exists the code was consumed — just navigate.
      const { data: existing } = await sb.auth.getSession()
      if (existing.session) {
        window.location.href = next
        return
      }

      // Flavor 2 — implicit hash tokens.
      if (typeof window !== 'undefined' && window.location.hash) {
        const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
        const params = new URLSearchParams(raw)
        const errorCode = params.get('error') ?? params.get('error_code')
        if (errorCode) {
          const desc = params.get('error_description')
          setErr(desc ? `${errorCode}: ${desc}` : errorCode)
          return
        }
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await sb.auth.setSession({ access_token, refresh_token })
          if (error) {
            setErr(`setSession: ${error.message}`)
            return
          }
          window.location.href = next
          return
        }
      }

      // Flavor 1 — PKCE code.
      const code = sp.get('code')
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code)
        if (error) {
          setErr(`exchangeCodeForSession: ${error.message}`)
          return
        }
        window.location.href = next
        return
      }

      setErr('Link de magic link inválido o expirado. Pedí uno nuevo.')
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <CallbackShell>
      {err ? (
        <>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-bad flex items-center justify-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 bg-bad" />
            error
          </div>
          <p className="text-sm text-fg-muted max-w-sm">{err}</p>
          <a href="/admin/login" className="btn mt-6 inline-flex">Volver a login →</a>
        </>
      ) : (
        <Loading />
      )}
    </CallbackShell>
  )
}

function CallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="text-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Wordmark size="md" variant="blue" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">admin</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 bg-brand animate-pulse" />
        verificando sesión
      </div>
      <p className="mt-2 text-xs text-fg-subtle">redirigiendo...</p>
    </>
  )
}
