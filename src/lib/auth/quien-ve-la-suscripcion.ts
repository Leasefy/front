/**
 * ¿Quién pide la suscripción de la inmobiliaria? (COBRANZA-MANUAL, 04-10-2026)
 *
 * El orquestador entró como auxiliar de cartera y la consola mostró un 403 en
 * `GET /inmobiliaria/subscription` al entrar: la cabecera, el menú y el guard de
 * la suscripción la pedían para todos, y el back la cierra con
 * `subscription:view` (el auxiliar de cartera y el abogado externo no lo
 * tienen). El login ya lo sabía: el bootstrap devuelve `null` para ellos.
 *
 * Sin pedirla, la suscripción queda «indeterminada» y todo falla ABIERTO (el
 * guard deja pasar; el back sigue siendo quien decide con su 402).
 */
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

/**
 * Los roles que, de fábrica, NO ven la suscripción (espejo de
 * `AGENCY_ROLE_DEFAULTS` del back: `subscription: []`).
 */
export const ROLES_SIN_LA_SUSCRIPCION: readonly string[] = [
  AGENCY_ROLES.AUXILIAR_CARTERA,
  AGENCY_ROLES.ABOGADO_EXTERNO,
]

/** Con los permisos ya cargados (dentro de `PermissionsProvider`). */
export function puedeVerLaSuscripcion(p: {
  isAdmin: boolean
  canAccess: (modulo: string, accion: string) => boolean
}): boolean {
  return p.isAdmin || p.canAccess('subscription', 'view')
}

/**
 * Sólo con el rol (el guard de la suscripción envuelve a `PermissionsProvider`
 * y no lo puede leer). Mientras no se sabe el rol, no se pide.
 */
export function laSuscripcionSePideConElRol(agencyRole: string | null | undefined): boolean {
  if (!agencyRole) return false
  return !ROLES_SIN_LA_SUSCRIPCION.includes(agencyRole)
}
