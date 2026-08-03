'use client'

import { getSupabase } from '@/lib/supabase/client'
import { Wordmark } from '@/components/admin/Wordmark'

/**
 * /admin/forbidden — reached when GET /me returns 403 (email not on
 * ADMIN_EMAILS). Terminal screen: does NOT loop back to login (FRONT.md §3.3).
 */
export default function AdminForbiddenPage() {
  async function signOut() {
    await getSupabase()?.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="max-w-md text-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Wordmark size="md" variant="blue" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">admin</span>
        </div>
        <div className="section-label justify-center mb-3">acceso denegado</div>
        <h1 className="font-display text-display tracking-tight mb-2 text-fg">No estás en la allowlist</h1>
        <p className="text-sm text-fg-muted mb-8">
          Tu email no está autorizado para el panel interno. Pedile a un admin que te agregue a
          <span className="font-mono"> ADMIN_EMAILS</span>.
        </p>
        <button onClick={signOut} className="btn">Cerrar sesión →</button>
      </div>
    </div>
  )
}
