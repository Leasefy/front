'use client';

/**
 * Permisos por rol: qué puede hacer cada rol de la agencia.
 *
 * La matriz completa (ADMIN/AGENTE/CONTADOR/VIEWER) viene y va en UNA sola
 * petición (`GET|PUT|DELETE /inmobiliaria/agency/role-permissions`). Guardar
 * también limpia los permisos propios de cada miembro activo de los roles
 * tocados, así que después se refrescan los del que está mirando.
 */

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useI18n } from '@/lib/i18n';
import { ConfigPermisos } from '@/components/inmobiliaria';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { rolePermissionsApi } from '@/lib/api/inmobiliaria.service';
import type { PermMap, RoleMatrices, UpdateRolePermissionsBody } from '@/lib/api/inmobiliaria.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion } from './piezas';
import type {
  AgencyRole,
  PermissionAction,
  PermissionModule,
  RolePermissions,
} from '@/lib/types/inmobiliaria';

/** PermMap del back (módulo → acciones) → RolePermissions de la UI. */
function permMapToRolePermissions(role: AgencyRole, map: PermMap): RolePermissions {
  return {
    role,
    permissions: Object.entries(map)
      .filter(([, actions]) => actions.length > 0)
      .map(([module, actions]) => ({
        module: module as PermissionModule,
        actions: [...actions] as PermissionAction[],
      })),
  };
}

function matricesToUiMatrix(matrices: RoleMatrices): Record<AgencyRole, RolePermissions> {
  return {
    admin: permMapToRolePermissions('admin', matrices.roles.ADMIN),
    agente: permMapToRolePermissions('agente', matrices.roles.AGENTE),
    contador: permMapToRolePermissions('contador', matrices.roles.CONTADOR),
    viewer: permMapToRolePermissions('viewer', matrices.roles.VIEWER),
  };
}

function rolePermissionsToPermMap(rp: RolePermissions): PermMap {
  const map: PermMap = {};
  for (const p of rp.permissions) map[p.module] = [...p.actions];
  return map;
}

export function SeccionPermisos() {
  const { t } = useI18n();
  const { refetch: refetchMyPermissions } = usePermissions();

  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(DEFAULT_ROLE_PERMISSIONS);
  // Sube en cada sincronización con el servidor y hace de `key`: el componente
  // se vuelve a montar con la matriz fresca (y sus contadores y su «hay
  // cambios sin guardar» vuelven a cero).
  const [version, setVersion] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  /**
   * El fallo de la LECTURA, entero.
   *
   * Antes se tragaba («quedan los valores por defecto») y la pantalla dibujaba
   * la matriz de fábrica como si fuera la de la agencia. Eso no era sólo una
   * mentira visual: si el admin tocaba una casilla y guardaba, el `PUT` mandaba
   * los valores POR DEFECTO y borraba lo que la agencia hubiera personalizado.
   * Ahora, si la lectura falla, no hay matriz que editar: hay un error con
   * reintentar.
   */
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    (async () => {
      try {
        const matrices = await rolePermissionsApi.getRolePermissions();
        if (cancelado) return;
        setPermissions(matricesToUiMatrix(matrices));
        setErrorDeCarga(null);
        setVersion((v) => v + 1);
      } catch (error) {
        if (cancelado) return;
        setErrorDeCarga(error);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const guardar = async (nuevos: Record<AgencyRole, RolePermissions>) => {
    setGuardando(true);
    try {
      // ADMIN nunca se manda: es acceso total y de sólo lectura en el back.
      const body: UpdateRolePermissionsBody = {
        AGENTE: rolePermissionsToPermMap(nuevos.agente),
        CONTADOR: rolePermissionsToPermMap(nuevos.contador),
        VIEWER: rolePermissionsToPermMap(nuevos.viewer),
      };
      const matrices = await rolePermissionsApi.updateRolePermissions(body);
      setPermissions(matricesToUiMatrix(matrices));
      setVersion((v) => v + 1);
      await refetchMyPermissions();
      toast.success(t('inmobiliaria.config.toasts.permissionsSaved'), {
        description: t('inmobiliaria.config.toasts.permissionsSavedDesc'),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.config.toasts.error') || 'Error al guardar permisos', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  /** Vuelve a los valores del sistema. Destructivo: el componente lo confirma. */
  const restablecer = async () => {
    setGuardando(true);
    try {
      const matrices = await rolePermissionsApi.resetRolePermissions();
      setPermissions(matricesToUiMatrix(matrices));
      setVersion((v) => v + 1);
      await refetchMyPermissions();
      toast.success(t('inmobiliaria.config.toasts.permissionsReset'), {
        description: t('inmobiliaria.config.toasts.permissionsResetDesc'),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.config.toasts.error') || 'Error al restablecer permisos', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <EstadoDeDatos
      cargando={cargando}
      error={errorDeCarga}
      queEs="los permisos por rol"
      onReintentar={() => setIntento((n) => n + 1)}
      esqueleto={<EsqueletoDeSeccion filas={5} />}
    >
      <ConfigPermisos
        key={`permisos-${version}`}
        permissions={permissions}
        onSave={guardar}
        onReset={restablecer}
        isLoading={guardando}
      />
    </EstadoDeDatos>
  );
}
