/**
 * 🔴 LOGIN-BUCLE r2 (06-10-2026): ¿dos avisos de auth-js hablan de la MISMA
 * sesión?
 *
 * En cada carga con sesión, auth-js avisa dos veces: SIGNED_IN (desde
 * `_recoverAndRefresh`, mientras se inicializa) y enseguida INITIAL_SESSION. El
 * AuthProvider corría el `claim` y `GET /users/me/bootstrap` en los DOS, uno
 * detrás del otro: con un back de 7 s la sesión se confirmaba a los ~15 s
 * (medido en el navegador). La huella decide si el segundo aviso puede reusar
 * lo que ya lanzó el primero.
 *
 * La misma sesión = el mismo access token, o el mismo usuario con la misma
 * expiración (el mismo token leído dos veces del almacenamiento puede llegar en
 * objetos distintos).
 */

export interface HuellaDeSesion {
  token: string
  userId?: string
  /** `expires_at` de Supabase, en segundos. */
  expiraEn?: number
}

interface SesionConHuella {
  access_token: string
  expires_at?: number
  user?: { id?: string } | null
}

export function huellaDe(sesion: SesionConHuella): HuellaDeSesion {
  return {
    token: sesion.access_token,
    userId: sesion.user?.id ?? undefined,
    expiraEn: typeof sesion.expires_at === 'number' ? sesion.expires_at : undefined,
  }
}

export function esLaMismaSesion(a: HuellaDeSesion, b: HuellaDeSesion): boolean {
  if (a.token && a.token === b.token) return true
  return (
    !!a.userId &&
    a.userId === b.userId &&
    typeof a.expiraEn === 'number' &&
    a.expiraEn === b.expiraEn
  )
}
