/**
 * Active-context persistence for DUAL-CONTEXT users — a user who has a personal
 * role (TENANT/LANDLORD) AND an ACTIVE agency membership, and can switch which
 * "hat" they are wearing.
 *
 * Persistence: a single localStorage entry scoped to the owner's userId (the
 * same userId-scoping pattern used by the tenant onboarding cache), so a
 * different account on a shared browser never inherits a stale context.
 * Single-context users (pure tenant / landlord / agent) never write this and
 * behave exactly as before.
 */

export type ActiveContext = 'personal' | 'agency'

const STORAGE_KEY = 'leasefy:active-context'

interface StoredActiveContext {
  userId?: string
  context?: ActiveContext
}

/**
 * Read the persisted active context for `userId`. Returns null when there is
 * no entry, the entry belongs to a DIFFERENT user (foreign → treated as
 * absent), or storage is unavailable/corrupt.
 */
export function readActiveContext(userId: string | null | undefined): ActiveContext | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredActiveContext
    if (!parsed || parsed.userId !== userId) return null
    return parsed.context === 'agency' || parsed.context === 'personal'
      ? parsed.context
      : null
  } catch {
    return null
  }
}

/** Persist the active context for `userId` and notify same-tab listeners. */
export function writeActiveContext(userId: string, context: ActiveContext): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, context }))
    window.dispatchEvent(new Event('active-context-updated'))
  } catch {
    // Storage unavailable (quota / private mode) — non-blocking.
  }
}

/** Remove the persisted context entirely (e.g. on sign-out). */
export function clearActiveContext(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * A dual-context user has a personal role (TENANT/LANDLORD) AND an ACTIVE
 * agency membership. Pure agents (role 'agency'), pure tenants and pure
 * landlords are single-context and must see NO context switcher.
 */
export function isDualContextUser(
  user: { role?: string } | null | undefined,
  hasActiveAgencyMembership: boolean,
): boolean {
  if (!user) return false
  const personalRole = user.role === 'tenant' || user.role === 'landlord'
  return personalRole && hasActiveAgencyMembership
}

/** El rol dentro de la inmobiliaria, como lo lee una persona. */
export const NOMBRE_DEL_ROL_EN_LA_INMOBILIARIA: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Asesor comercial',
  CONTADOR: 'Contador',
  VIEWER: 'Sólo lectura',
  COORDINADOR: 'Coordinador',
  AUXILIAR_CARTERA: 'Auxiliar de cartera',
  ABOGADO_EXTERNO: 'Abogado externo',
  AUXILIAR_COMERCIAL: 'Auxiliar comercial',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
  AUXILIAR_CONTABLE: 'Auxiliar contable',
  AUXILIAR_MANTENIMIENTO: 'Auxiliar de mantenimiento',
}

/** «Inquilino» o «Propietario»: la cuenta personal. */
export function nombreDeLaCuentaPersonal(role: string | null | undefined): string {
  return role === 'landlord' ? 'Propietario' : 'Inquilino'
}

/**
 * 🔴 Qué tipo de cuenta se está usando AHORA (Nico, 20-10-2026): una persona
 * que nació inquilina y a la que invitó una inmobiliaria veía «Inquilino» bajo
 * su correo aun trabajando dentro de la inmobiliaria. La etiqueta dice la
 * plataforma ACTIVA: «Inmobiliaria · Administrador» o «Inquilino».
 */
export function etiquetaDeLaPlataforma(params: {
  role?: string | null
  activeContext: ActiveContext
  hasActiveAgencyMembership: boolean
  agencyRole?: string | null
}): string {
  const enLaInmobiliaria =
    params.role === 'agency' || (params.activeContext === 'agency' && params.hasActiveAgencyMembership)
  if (!enLaInmobiliaria) return nombreDeLaCuentaPersonal(params.role)
  const rol = params.agencyRole ? NOMBRE_DEL_ROL_EN_LA_INMOBILIARIA[params.agencyRole] : null
  return rol ? `Inmobiliaria · ${rol}` : 'Inmobiliaria'
}

/** ¿Lo que se abre desde el menú (perfil, configuración) es de la inmobiliaria? */
export function estaEnLaInmobiliaria(params: {
  role?: string | null
  activeContext: ActiveContext
  hasActiveAgencyMembership: boolean
}): boolean {
  return params.role === 'agency' || (params.activeContext === 'agency' && params.hasActiveAgencyMembership)
}

/**
 * 🔴 El nombre que se ve arriba, en el menú (Nico, 20-10-2026: «que no le
 * aparezca el nombre del inquilino a esa persona»). Dentro de la inmobiliaria,
 * el de la membresía (`memberName`: el de la invitación si la cuenta es de otro,
 * p. ej. un inquilino que tenía ese correo); en la cuenta personal, el suyo.
 */
export function nombreEnLaPlataforma(params: {
  nombreDeLaCuenta?: string | null
  nombreEnLaInmobiliaria?: string | null
  enLaInmobiliaria: boolean
}): string {
  const delMiembro = params.enLaInmobiliaria ? params.nombreEnLaInmobiliaria?.trim() : null
  return delMiembro || params.nombreDeLaCuenta?.trim() || 'Usuario'
}
