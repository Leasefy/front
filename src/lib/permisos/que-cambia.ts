/**
 * CF-09 (QA del 04-10): «Confirmar cambios» de Permisos no decía QUÉ cambiaba.
 * Esto compara la matriz guardada con la editada y lo dice en una frase por
 * cambio: «Asesor comercial pierde Pipeline · Ver».
 */
import {
  ALL_PERMISSION_ACTIONS,
  ALL_PERMISSION_MODULES,
  getActionLabel,
  getModuleLabel,
  getRoleLabel,
  hasPermission,
  type RolDeLaMatriz,
  type RolePermissions,
} from '@/lib/types/inmobiliaria';

type Matrices = Partial<Record<RolDeLaMatriz, RolePermissions>>;

export function queCambiaEnLosPermisos(antes: Matrices, despues: Matrices): string[] {
  const frases: string[] = [];
  const roles = Object.keys(despues) as RolDeLaMatriz[];
  for (const rol of roles) {
    if (rol === 'admin') continue; // el administrador siempre lo tiene todo
    const a = antes[rol] ?? { role: rol, permissions: [] };
    const d = despues[rol] ?? { role: rol, permissions: [] };
    for (const modulo of ALL_PERMISSION_MODULES) {
      for (const accion of ALL_PERMISSION_ACTIONS) {
        const tenia = hasPermission(a, modulo, accion);
        const tiene = hasPermission(d, modulo, accion);
        if (tenia === tiene) continue;
        frases.push(
          `${getRoleLabel(rol)} ${tiene ? 'gana' : 'pierde'} ${getModuleLabel(modulo)} · ${getActionLabel(accion)}`,
        );
      }
    }
  }
  return frases;
}
