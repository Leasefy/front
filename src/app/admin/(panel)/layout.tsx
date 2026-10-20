'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { WarningCircle } from '@phosphor-icons/react'
import { Appear } from '@leasefy/cadence'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { getSupabase } from '@/lib/supabase/client'
import { adminApi, ApiError, esFaltaDeSegundoFactor, setAdminToken } from '@/lib/admin/api'
import type { Me } from '@/lib/admin/types'
import { personaDelAdmin, type PersonaDelAdmin } from '@/lib/admin/persona-del-admin'
import { cn } from '@/lib/utils'
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext'
import { Button } from '@/components/ui/button'
import { Nav } from '@/components/admin/Nav'
import { CabeceraDelAdmin } from '@/components/admin/CabeceraDelAdmin'
import { BuscadorDelAdmin } from '@/components/admin/BuscadorDelAdmin'

type Status = 'checking' | 'authorized' | 'error'

/**
 * Gate for the admin app (FRONT.md §3.3):
 *   - no session            → /admin/login?next=<path>
 *   - session, GET /me 200  → render Nav + screen
 *   - session, GET /me 403  → /admin/forbidden (email not on ADMIN_EMAILS)
 *   - session, GET /me 403 SEGUNDO_FACTOR_REQUERIDO → /admin/segundo-factor
 *     (on the list, but the session has no second factor — 23-09)
 * Public routes (login / auth/callback / forbidden) live outside this group,
 * so they render without the gate.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<Status>('checking')
  const [persona, setPersona] = useState<PersonaDelAdmin | null>(null)

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
        // El nombre y el cargo («Nico · CPO») salen de los metadatos de la
        // cuenta; el correo, del back (es el que pasó la lista).
        setPersona(personaDelAdmin(me.email ?? session.user.email ?? '', session.user.user_metadata))
        setStatus('authorized')
      } catch (err) {
        if (cancelled) return
        // 🔴 23-09: en la lista pero sin segundo factor. `adminApi` ya está
        // navegando a `/admin/segundo-factor`; mandarlo a «forbidden» encima le
        // diría a un admin de verdad que no está autorizado.
        if (esFaltaDeSegundoFactor(err)) return
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

  if (status !== 'authorized' || !persona) {
    return <GuardSplash error={status === 'error'} />
  }

  return (
    <SidebarProvider>
      <Armazon persona={persona}>{children}</Armazon>
    </SidebarProvider>
  )
}

/**
 * El armazón del panel, el mismo del panel de la inmobiliaria: la barra fija a
 * la izquierda (240 px, 64 plegada), la cabecera pegada arriba y el contenido
 * con tope de 1.920 px (más ancho, las tablas obligan a barrer la pantalla).
 */
function Armazon({ persona, children }: { persona: PersonaDelAdmin; children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()
  const [buscando, setBuscando] = useState(false)
  return (
    <div className="min-h-screen bg-plan-page">
      <Nav onBuscar={() => setBuscando(true)} />
      <div className={cn('transition-all duration-200', isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]')}>
        <CabeceraDelAdmin persona={persona} onBuscar={() => setBuscando(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1920px] outline-none">
          {children}
        </main>
      </div>
      <BuscadorDelAdmin abierto={buscando} onAbierto={setBuscando} />
    </div>
  )
}

/**
 * Mientras se pregunta si la cuenta entra: la carga de marca, igual que la
 * puerta de los paneles de la plataforma (`ProtectedRoute`). Si no se pudo
 * verificar, lo dice y deja reintentar o volver a entrar.
 */
function GuardSplash({ error }: { error: boolean }) {
  if (!error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <CargaDeMarca tamano="lg" disposicion="apilada" texto="Verificando acceso..." />
      </div>
    )
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <Appear distance="sm" className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-danger-soft">
          <WarningCircle className="h-7 w-7 text-danger" weight="fill" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-h2 text-fg">No pudimos verificar tu acceso</h1>
          <p className="text-body-sm text-fg-muted">
            El servidor no respondió a tiempo. Prueba otra vez; si sigue igual, vuelve a entrar.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button hideArrow onClick={() => window.location.reload()}>
            Reintentar
          </Button>
          <Button asChild variant="outline" hideArrow>
            <a href="/admin/login">Volver a entrar</a>
          </Button>
        </div>
      </Appear>
    </div>
  )
}
