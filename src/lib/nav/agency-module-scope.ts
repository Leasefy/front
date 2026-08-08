import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';

/**
 * Alcance de navegación por rol — qué MÓDULOS DE NEGOCIO ve cada quien.
 *
 * ⚠️ Esto NO es seguridad. Es encuadre: recorta el menú para que cada persona
 * vea su trabajo y no el ajeno. Quien enforce el acceso real sigue siendo el
 * backend (`effectivePermissions` de GET /inmobiliaria/agency/my-permissions,
 * más los guards de cada endpoint). Ocultar una fila no protege una ruta:
 * escribir la URL a mano sigue dependiendo del backend, como debe ser.
 *
 * Por qué existe: el panel mostraba los tres módulos a todos, y al entrar nadie
 * sabía cuál era el suyo. "Que el comercial vea su módulo comercial con sus
 * agentes comerciales… no nos interesa que entre un comercial y mire si ya
 * facturamos — eso es dañarle la visual" (definición del negocio).
 *
 * Regla de diseño: este mapa solo puede QUITAR de la navegación, nunca agregar.
 * Un rol jamás ve acá algo que su `effectivePermissions` no le conceda.
 */

/** Los tres módulos del negocio + lo transversal. */
export const BUSINESS_MODULES = ['comercial', 'administracion', 'finanzas', 'general'] as const;

export type BusinessModule = (typeof BUSINESS_MODULES)[number];

/**
 * Qué módulos ve cada rol.
 *
 * Deliberadamente conservador: respecto de lo que cada rol veía antes, lo único
 * que se recorta es lo que la reunión pidió explícitamente —
 *   · AGENTE (comercial) pierde FINANZAS;
 *   · CONTADOR pierde COMERCIAL.
 * Todo lo demás queda igual, así nadie pierde de golpe una pantalla que usaba.
 * Para mover a alguien de módulo, se edita SOLO esta tabla.
 */
export const ROLE_MODULE_SCOPE: Record<AgencyRole, readonly BusinessModule[]> = {
  // Dueño de la operación: ve el negocio completo.
  [AGENCY_ROLES.ADMIN]: BUSINESS_MODULES,
  // Comercial: conseguir inmuebles, estudiar clientes, cerrar. Conserva
  // administración porque cerrar termina en contrato, agenda y mensajes.
  [AGENCY_ROLES.AGENTE]: ['comercial', 'administracion', 'general'],
  // Contable/administrativo: cartera, dispersiones, facturación, contabilidad.
  [AGENCY_ROLES.CONTADOR]: ['administracion', 'finanzas', 'general'],
  // Solo lectura: el alcance no se recorta — el backend ya le niega las
  // acciones. Recortarle además el menú lo dejaría sin poder consultar nada.
  [AGENCY_ROLES.VIEWER]: BUSINESS_MODULES,
};

export interface ModuleScopeContext {
  isAdmin: boolean;
  agencyRole: string | null;
}

/**
 * ¿Este rol ve el módulo?
 *
 * - Ítems sin `scope` (Inicio, encabezados) → siempre visibles.
 * - `isAdmin` → todo, sin consultar la tabla.
 * - Rol desconocido o aún sin cargar (`null`) → NO se recorta nada: el gate de
 *   permisos (`canAccess`) ya falla cerrado durante la carga, y recortar acá
 *   también dejaría el menú vacío en vez de mostrar el esqueleto.
 */
export function canSeeBusinessModule(
  scope: BusinessModule | undefined,
  ctx: ModuleScopeContext,
): boolean {
  if (!scope) return true;
  if (ctx.isAdmin) return true;
  if (ctx.agencyRole === null) return true;
  const allowed = ROLE_MODULE_SCOPE[ctx.agencyRole as AgencyRole];
  // Rol que el backend agregó y el front todavía no conoce → no recortar.
  if (!allowed) return true;
  return allowed.includes(scope);
}
