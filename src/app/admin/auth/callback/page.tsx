'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect'
import { Button } from '@/components/ui/button'
import { MonoLabel, Spinner } from '@leasefy/cadence'
import { WarningCircle } from '@phosphor-icons/react'
import { MarcoDeAcceso, TituloDeAcceso } from '@/components/admin/acceso/MarcoDeAcceso'

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
  /** El código que mandó Supabase (`access_denied`, `otp_expired`), para soporte. */
  const [codigoDelError, setCodigoDelError] = useState<string | null>(null)

  useEffect(() => {
    const sb = getSupabase()
    // 🔴 `next` viene de la URL y termina en `window.location.href`. Sin
    // sanear, `?next=javascript:…` corría código en el origen de Leasefy con
    // la sesión de quien abriera el enlace —y la sesión vive en cookies que JS
    // puede leer—: un clic y la cuenta era del atacante. Y `?next=https://…`
    // era una redirección abierta con la marca de leasefy.co. No hacía falta
    // venir de un enlace mágico: con una sesión ya abierta, el
    // `INITIAL_SESSION` navegaba al instante (auditoría de seguridad 23-09).
    const next = sanitizeReturnUrl(sp.get('next'), '/admin')

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
        // La descripción de Supabase viene en inglés («Email link is invalid
        // or has expired»): se dice en español y el código queda abajo.
        setErr('El enlace venció o ya se usó. Pide uno nuevo y ábrelo en este mismo navegador.')
        setCodigoDelError(params.get('error_code') ?? errorCode)
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
        setErr('Puede que haya vencido o que ya lo hayas usado. Pide uno nuevo y ábrelo en este navegador.')
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
        <div className="space-y-7" data-testid="admin-callback-error">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-danger-soft">
            <WarningCircle className="h-7 w-7 text-danger" weight="fill" aria-hidden="true" />
          </div>
          <TituloDeAcceso titulo="No pudimos abrir el enlace" bajada={err} />
          {codigoDelError ? (
            <MonoLabel className="block">Referencia: {codigoDelError}</MonoLabel>
          ) : null}
          <Button asChild hideArrow className="h-11 w-full rounded-full text-[14px]">
            <a href="/admin/login">Pedir un enlace nuevo</a>
          </Button>
        </div>
      ) : (
        <Loading />
      )}
    </CallbackShell>
  )
}

function CallbackShell({ children }: { children: React.ReactNode }) {
  return <MarcoDeAcceso data-testid="admin-callback">{children}</MarcoDeAcceso>
}

function Loading() {
  return (
    <div className="flex items-center gap-3 text-body-sm text-fg-muted" role="status">
      <Spinner size="sm" />
      <span>Verificando tu sesión…</span>
    </div>
  )
}
