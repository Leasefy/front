/**
 * Roles de miembro de agencia. Espeja lo que devuelve el backend en
 * `MemberPermissionsResponse.role` (GET /inmobiliaria/agency/my-permissions).
 */
export const AGENCY_ROLES = {
  ADMIN: 'ADMIN',
  AGENTE: 'AGENTE',
  CONTADOR: 'CONTADOR',
  VIEWER: 'VIEWER',
  /**
   * 🔴 O-05 (18-09-2026): los TRES roles nuevos. Se SUMAN a los cuatro de
   * siempre; ninguno de ésos cambia.
   *
   * · COORDINADOR — ve el equipo y reasigna. No mueve plata.
   * · AUXILIAR_CARTERA — hace recibos; no anula ni condona.
   * · ABOGADO_EXTERNO — sólo sus casos (el back le recorta las rutas de
   *   cartera además de los módulos).
   *
   * ⚠️ Asignarlos exige la migración `20260918183000` en la base: sin ella el
   * back responde 503 con su nombre, no un 500.
   */
  COORDINADOR: 'COORDINADOR',
  AUXILIAR_CARTERA: 'AUXILIAR_CARTERA',
  ABOGADO_EXTERNO: 'ABOGADO_EXTERNO',
} as const;

export type AgencyRole = typeof AGENCY_ROLES[keyof typeof AGENCY_ROLES];

/**
 * Roles con permisos de gestión operativa (crear/editar/cancelar/firmar contratos, usar chat).
 * Mientras el backend no agregue 'contratos' a AGENCY_MODULES, gateamos por rol.
 */
export const AGENCY_MANAGER_ROLES: readonly string[] = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.AGENTE];

/**
 * Devuelve true si el usuario puede ejecutar acciones operativas de agencia
 * (editar contratos, cancelar, firmar, activar, abrir chat).
 * Admin + Agente. Contador y Viewer: false.
 */
export function isAgencyManager(params: { isAdmin: boolean; agencyRole: string | null }): boolean {
  return params.isAdmin || (params.agencyRole !== null && AGENCY_MANAGER_ROLES.includes(params.agencyRole));
}

/**
 * Devuelve true si el usuario es cualquier miembro activo de la agencia
 * (incluye Contador y Viewer — pueden ver reportes, contratos, etc.).
 */
export function isAgencyMember(params: { isAdmin: boolean; agencyRole: string | null }): boolean {
  return params.isAdmin || params.agencyRole !== null;
}
