/**
 * Cerrar una sesión de verdad: en el back Y en Supabase, con el token que
 * todavía está vivo.
 *
 * ── Por qué existe (endurecimiento de la sesión, 23-09) ───────────────────
 * El cierre de sesión revocaba en el back (`POST /auth/session/revoke`, que
 * deja muerto el access token para NUESTRA API) y después llamaba a
 * `supabase.auth.signOut({ scope: 'local' })`. Pero lo llamaba DESPUÉS de
 * `purgarSesionLocal()`, que borra las cookies `sb-*`, y auth-js lee la sesión
 * de esas cookies para saber qué token mandar a `/logout`: sin cookies no hay
 * sesión, no hay llamada, y el REFRESH TOKEN seguía vivo en Supabase.
 * Medido en `@supabase/auth-js` 2.106 (`GoTrueClient._signOut`).
 *
 * El costo de eso: quien hubiera copiado la cookie (un XSS, un equipo
 * compartido, una extensión) podía renovar la sesión después del «Cerrar
 * sesión» y volver a reclamarla en el back (`/auth/session/claim` acepta
 * cualquier token válido — es el login). Revocar en Supabase mata la familia de
 * refresh tokens de ESTA sesión.
 *
 * `scope: 'local'` (sólo esta sesión) y no `'global'`: este mismo cierre corre
 * cuando OTRO dispositivo desplazó a éste (SESSION_SUPERSEDED), y un `global`
 * ahí sacaría a la persona del dispositivo nuevo, que es el legítimo.
 *
 * Nunca tira: un Supabase o un back caído no puede dejar a nadie adentro.
 */

import { revokeSession } from '@/lib/api/session.service'
import { getSupabase } from '@/lib/supabase/client'

/** Revoca esta sesión en Supabase (mata su refresh token). */
export async function revocarEnSupabase(token: string): Promise<void> {
  try {
    const supabase = getSupabase()
    // `admin.signOut(jwt)` es `POST /logout` con el JWT de la PERSONA: no usa
    // la llave de servicio (el cliente del navegador no la tiene) y no lee
    // nada del almacenamiento, que ya puede estar borrado.
    await supabase?.auth.admin.signOut(token, 'local')
  } catch {
    // Sin red: se pierde la revocación, no la salida.
  }
}

/** Revoca en el back y en Supabase, en paralelo, sin tirar nunca. */
export async function revocarSesion(token: string): Promise<void> {
  await Promise.all([revokeSession(token).catch(() => {}), revocarEnSupabase(token)])
}
