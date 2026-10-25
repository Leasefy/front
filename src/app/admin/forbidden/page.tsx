'use client'

import { LockKey } from '@phosphor-icons/react'

import { getSupabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MarcoDeAcceso, TituloDeAcceso } from '@/components/admin/acceso/MarcoDeAcceso'

/**
 * /admin/forbidden — se llega cuando `GET /me` responde 403: el correo no está
 * en `ADMIN_EMAILS`. Pantalla final: NO vuelve sola al login (FRONT.md §3.3),
 * pero deja cerrar la sesión para entrar con otra cuenta.
 */
export default function AdminForbiddenPage() {
  async function signOut() {
    await getSupabase()?.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <MarcoDeAcceso data-testid="admin-sin-acceso">
      <div className="space-y-7">
        {/* Glow up 22-10: el ícono suelto, sin su baldosa. */}
        <LockKey className="h-9 w-9 text-fg" weight="duotone" aria-hidden="true" />
        <TituloDeAcceso
          titulo="Esta cuenta no entra al admin"
          bajada="El admin es sólo para el equipo de Leasefy. Si eres del equipo, pide que agreguen tu correo a la lista de administradores y vuelve a entrar."
        />
        <Button variant="outline" hideArrow onClick={() => void signOut()} className="h-11 w-full rounded-full text-[14px]">
          Entrar con otra cuenta
        </Button>
      </div>
    </MarcoDeAcceso>
  )
}
