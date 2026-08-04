'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { Wordmark } from '@/components/admin/Wordmark'

/**
 * /admin/auth/callback — handles BOTH Supabase OTP-return flavors (FRONT.md §3.2):
 *   1. PKCE (`?code=...`)                        → exchanged by detectSessionInUrl
 *   2. Implicit (`#access_token=...&refresh=…`)  → exchanged by detectSessionInUrl
 * Hard-navigates to `next` once the session is set.
 *
 * IMPORTANT: this page must NEVER call `sb.auth.getSession()`. The app-wide
 * AuthProvider (mounted in the root layout, so it also wraps /admin) runs its
 * own onAuthStateChange handler on mount; while that handler is mid-flight,
 * `getSession()` deadlocks and the callback hangs forever on "verificando
 * sesión…" (project convention — see admin/(panel)/layout.tsx and
 * auth-context.tsx). We subscribe to onAuthStateChange instead and let the SSR
 * browser client's `detectSessionInUrl` exchange the code/hash, then navigate on
 * the resulting session.
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

    if (!sb) {
      setErr('Supabase no configurado.')
      return
    }

    // Surface an explicit error carried in the implicit-flow hash (expired /
    // already-used link) before we wait on anything.
    if (typeof window !== 'undefined' && window.location.hash) {
      const raw = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(raw)
      const errorCode = params.get('error') ?? params.get('error_code')
      if (errorCode) {
        const desc = params.get('error_description')
        setErr(desc ? `${errorCode}: ${desc}` : errorCode)
        return
      }
    }

    // Are we returning from a magic link (code / implicit tokens present)? If so,
    // the FIRST onAuthStateChange event (INITIAL_SESSION) may report a *stale*
    // persisted account — e.g. a tenant already logged in on leasefy.co. We must
    // wait for the freshly exchanged session (SIGNED_IN) before navigating, or
    // we'd carry the wrong account into the admin gate.
    const returningFromLink =
      !!sp.get('code') ||
      (typeof window !== 'undefined' && /(?:^|[#&])access_token=/.test(window.location.hash))

    let navigated = false
    const go = () => {
      if (navigated) return
      navigated = true
      window.location.href = next
    }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (returningFromLink && event === 'INITIAL_SESSION') return
      if (session) go()
    })

    // Never-hang safety net (mirrors auth-context.tsx). If no usable session
    // arrives, the link was invalid/expired — tell the user instead of spinning.
    const safety = setTimeout(() => {
      if (!navigated) {
        setErr('No pudimos verificar el magic link. Puede haber expirado o ya fue usado — pedí uno nuevo.')
      }
    }, 8000)

    return () => {
      clearTimeout(safety)
      subscription.unsubscribe()
    }
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
