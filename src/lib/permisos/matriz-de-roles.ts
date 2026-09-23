/**
 * 🔴 PERMISOS POR ROL Y POR PERSONA — lo que la pantalla traduce y compara
 * (22-09-2026, noche).
 *
 * Dos pedidos de Nico y un defecto reportado por otro agente:
 *   · «Permisos por rol» mostraba 4 roles y el enum del back tiene 7;
 *   · guardar mandaba TODOS los roles (con los valores que la pantalla
 *     creyera), y el back reescribía el objeto entero: un rol que no venía
 *     volvía a fábrica. Ahora se manda SÓLO lo que la persona tocó
 *     (`cuerpoConLoQueCambio`) — y el back, por su lado, tampoco toca lo que no
 *     llega;
 *   · permisos por PERSONA: qué hereda de su rol, qué se le sumó y qué se le
 *     quitó (`diferenciasConElRol`).
 */

import type { PermMap, RoleMatrices, UpdateRolePermissionsBody } from '@/lib/api/inmobiliaria.service';
import {
  ALL_PERMISSION_ACTIONS,
  ALL_PERMISSION_MODULES,
  PERMISOS_PUNTUALES,
  ROLES_DEL_SISTEMA,
  type AccionDePermiso,
  type AgencyRole,
  type PermissionModule,
  type RolDeLaMatriz,
  type RolePermissions,
} from '@/lib/types/inmobiliaria';

/** El nombre del rol en el back (`AgencyMemberRole`). */
export const ROL_EN_EL_BACK: Record<AgencyRole, keyof RoleMatrices['roles']> = {
  admin: 'ADMIN',
  agente: 'AGENTE',
  contador: 'CONTADOR',
  viewer: 'VIEWER',
  coordinador: 'COORDINADOR',
  auxiliar_cartera: 'AUXILIAR_CARTERA',
  abogado_externo: 'ABOGADO_EXTERNO',
};

/** PermMap del back (módulo → acciones) → RolePermissions de la UI. */
export function permMapToRolePermissions(role: AgencyRole, map: PermMap): RolePermissions {
  return {
    role,
    permissions: Object.entries(map)
      .filter(([, actions]) => actions.length > 0)
      .map(([module, actions]) => ({
        module: module as PermissionModule,
        actions: [...actions] as AccionDePermiso[],
      })),
  };
}

export function rolePermissionsToPermMap(rp: RolePermissions): PermMap {
  const map: PermMap = {};
  for (const p of rp.permissions) map[p.module] = [...p.actions] as PermMap[string];
  return map;
}

/**
 * Los roles que devolvió el back, en el orden de siempre. Un back anterior al
 * 22-09 noche no manda los tres de O-05: esos no se muestran (mostrarlos con
 * valores inventados y dejarlos guardar es justo el defecto que se cierra).
 */
export function matricesToUiMatrix(
  matrices: RoleMatrices,
): Partial<Record<RolDeLaMatriz, RolePermissions>> {
  const out: Partial<Record<RolDeLaMatriz, RolePermissions>> = {};
  for (const rol of ROLES_DEL_SISTEMA) {
    const map = matrices.roles[ROL_EN_EL_BACK[rol]];
    if (map) out[rol] = permMapToRolePermissions(rol, map);
  }
  return out;
}

/** Todas las acciones que la pantalla puede marcar en un módulo. */
function accionesDe(modulo: PermissionModule): AccionDePermiso[] {
  return [
    ...ALL_PERMISSION_ACTIONS,
    ...PERMISOS_PUNTUALES.filter((p) => p.modulo === modulo).map((p) => p.accion),
  ];
}

/** ¿Dan las dos matrices las mismas acciones? (sin orden, ausente = nada) */
export function mismaMatriz(a: PermMap, b: PermMap): boolean {
  return ALL_PERMISSION_MODULES.every((m) => {
    const x = new Set(a[m] ?? []);
    const y = new Set(b[m] ?? []);
    return x.size === y.size && [...x].every((v) => y.has(v));
  });
}

/**
 * 🔴 El cuerpo del PUT: SÓLO los roles que cambiaron respecto de lo que se
 * cargó. El ADMIN nunca va. Vacío = no hay nada que guardar.
 */
export function cuerpoConLoQueCambio(
  cargado: Partial<Record<RolDeLaMatriz, RolePermissions>>,
  editado: Partial<Record<RolDeLaMatriz, RolePermissions>>,
): UpdateRolePermissionsBody {
  const cuerpo: UpdateRolePermissionsBody = {};
  for (const rol of ROLES_DEL_SISTEMA) {
    if (rol === 'admin') continue;
    const antes = cargado[rol];
    const despues = editado[rol];
    if (!antes || !despues) continue;
    const a = rolePermissionsToPermMap(antes);
    const d = rolePermissionsToPermMap(despues);
    if (!mismaMatriz(a, d)) {
      (cuerpo as Record<string, PermMap>)[ROL_EN_EL_BACK[rol]] = d;
    }
  }
  return cuerpo;
}

// ── Permisos de UNA persona ────────────────────────────────────────────────

export interface Diferencia {
  modulo: PermissionModule;
  accion: AccionDePermiso;
  /** `sumado` = su rol no lo trae y ella sí; `quitado` = su rol lo trae y ella no. */
  tipo: 'sumado' | 'quitado';
}

/** Qué tiene la persona distinto de su rol, en orden de módulo y acción. */
export function diferenciasConElRol(propios: PermMap, delRol: PermMap): Diferencia[] {
  const out: Diferencia[] = [];
  for (const modulo of ALL_PERMISSION_MODULES) {
    const p = new Set(propios[modulo] ?? []);
    const r = new Set(delRol[modulo] ?? []);
    for (const accion of accionesDe(modulo)) {
      if (p.has(accion as never) && !r.has(accion as never)) out.push({ modulo, accion, tipo: 'sumado' });
      if (!p.has(accion as never) && r.has(accion as never)) out.push({ modulo, accion, tipo: 'quitado' });
    }
  }
  return out;
}

/** Marca o desmarca UNA acción en una matriz, sin mutar la original. */
export function conAccion(
  matriz: PermMap,
  modulo: PermissionModule,
  accion: AccionDePermiso,
  marcada: boolean,
): PermMap {
  const actual = new Set<string>(matriz[modulo] ?? []);
  if (marcada) actual.add(accion);
  else actual.delete(accion);
  return {
    ...matriz,
    [modulo]: accionesDe(modulo).filter((a) => actual.has(a)) as PermMap[string],
  };
}

