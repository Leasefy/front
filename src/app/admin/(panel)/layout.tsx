'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { adminApi, ApiError, setAdminToken } from '@/lib/admin/api'
import type { Me } from '@/lib/admin/types'
import { Nav } from '@/components/admin/Nav'
import { Wordmark } from '@/components/admin/Wordmark'

type Status = 'checking' | 'authorized' | 'error'

/**
 * Gate for the admin app (FRONT.md §3.3):
 *   - no session            → /admin/login?next=<path>
 *   - session, GET /me 200  → render Nav + screen
 *   - session, GET /me 403  → /admin/forbidden (email not on ADMIN_EMAILS)
 * Public routes (login / auth/callback / forbidden) live outside this group,
 * so they render without the gate.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<Status>('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    let cancelled = false

    async function check(session: Session | null) {
      if (!session) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`)
        return
      }
      try {
        const me = await adminApi<Me>('/me')
        if (cancelled) return
        setEmail(me.email ?? session.user.email ?? '')
        setStatus('authorized')
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) {
          router.replace('/admin/forbidden')
          return
        }
        console.error('[admin-gate] /me check failed:', err)
        setStatus('error')
      }
    }

    // getSession() deadlocks while AuthProvider's auth callback is mid-flight
    // (project convention: rely exclusively on onAuthStateChange — see
    // auth-context.tsx). INITIAL_SESSION fires on subscribe with the
    // persisted session; we only act on the first event.
    let checked = false
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setAdminToken(session?.access_token ?? null)
      if (checked) return
      checked = true
      void check(session)
    })

    // Safety net (same pattern as auth-context.tsx): some refresh flows never
    // emit INITIAL_SESSION — without this the gate would spin forever.
    const safetyTimeout = setTimeout(() => {
      if (!checked && !cancelled) {
        console.error('[admin-gate] no auth event within 5s — cannot verify access')
        setStatus('error')
      }
    }, 5000)

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status !== 'authorized') {
    return <GuardSplash error={status === 'error'} />
  }

  return (
    <div className="flex min-h-screen">
      <Nav userEmail={email} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  )
}

function GuardSplash({ error }: { error: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="text-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Wordmark size="md" variant="blue" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">admin</span>
        </div>
        <div
          className={
            'font-mono text-[11px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 ' +
            (error ? 'text-bad' : 'text-fg-muted')
          }
        >
          <span className={'inline-block w-2 h-2 ' + (error ? 'bg-bad' : 'bg-brand animate-pulse')} />
          {error ? 'no se pudo verificar el acceso' : 'verificando acceso'}
        </div>
      </div>
    </div>
  )
}
