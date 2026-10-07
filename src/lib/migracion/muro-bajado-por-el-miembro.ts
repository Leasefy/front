'use client'

/**
 * QA-MIGRACION-95 (MU-12, Nico 06-10-2026, opción «(a)»): el muro bajado por
 * un MIEMBRO que no puede resolver la migración.
 *
 * Resolver la migración (terminar u omitir) pide `configuracion:edit`, que en
 * una inmobiliaria nueva sólo tiene el administrador. Al asesor o al contador
 * invitados, «En otro momento» y la ✕ los dejaban encerrados detrás del muro
 * (403). Para ellos el muro baja SÓLO en su sesión: no se toca la migración de
 * la inmobiliaria (la sigue terminando un administrador) y se recuerda por
 * persona y por inmobiliaria en este navegador, como las otras marcas del muro.
 * Sin almacenamiento, vale para esta carga.
 */

const PREFIJO = 'leasefy:migracion:bajado-por-el-miembro:'

function clave(agencyId: string | null | undefined, userId: string | null | undefined): string {
  return `${PREFIJO}${agencyId ?? 'agencia'}:${userId ?? 'persona'}`
}

export function muroBajadoPorElMiembro(
  agencyId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(clave(agencyId, userId)) === '1'
  } catch {
    return false
  }
}

export function recordarMuroBajadoPorElMiembro(
  agencyId: string | null | undefined,
  userId: string | null | undefined,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(clave(agencyId, userId), '1')
  } catch {
    // Sin almacenamiento: vale para esta carga, y la próxima vez se vuelve a ofrecer.
  }
}
