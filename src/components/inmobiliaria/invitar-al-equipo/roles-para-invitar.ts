import { getRoleLabel, ROLES_DEL_SISTEMA, type AgencyRole } from '@/lib/types/inmobiliaria';

/**
 * Los roles que se ofrecen al invitar, cada uno con UNA línea de qué puede
 * hacer (02-10-2026, rediseño de «Invitar a tu equipo»).
 *
 * Son los siete del back (`ROLES_DEL_SISTEMA`, mismo orden y mismo nombre que
 * la tabla del equipo). La línea sale de los permisos de fábrica de cada rol
 * (`role-defaults.ts` del back), no de lo que «debería» hacer: si una
 * inmobiliaria ajustó su matriz, eso se ve y se cambia en Configuración.
 *
 * Antes el popover ofrecía tres roles en tarjetas grandes y «Agente» mandaba a
 * otra pantalla: no se podía invitar a un asesor desde acá.
 */

const QUE_PUEDE_HACER: Record<AgencyRole, string> = {
  admin: 'Todo, incluido el equipo, los permisos y el plan.',
  coordinador: 'Reparte el trabajo del equipo y reasigna casos. No mueve plata.',
  agente: 'Capta inmuebles y propietarios y lleva sus leads. No ve plata ni contratos en curso.',
  auxiliar_cartera: 'Registra pagos y hace recibos. No anula ni condona.',
  contador: 'Cobros, dispersiones, reportes y contabilidad. Puede pagar el plan.',
  abogado_externo: 'Sólo ve y lleva sus casos jurídicos.',
  viewer: 'Consulta la operación sin cambiar nada.',
};

export interface RolParaInvitar {
  rol: AgencyRole;
  nombre: string;
  queHace: string;
}

export const ROLES_PARA_INVITAR: readonly RolParaInvitar[] = ROLES_DEL_SISTEMA.map((rol) => ({
  rol,
  nombre: getRoleLabel(rol),
  queHace: QUE_PUEDE_HACER[rol],
}));

/** El rol con menos alcance: si nadie elige, nadie recibe de más. */
export const ROL_POR_DEFECTO: AgencyRole = 'viewer';

export function queHaceElRol(rol: AgencyRole): string {
  return QUE_PUEDE_HACER[rol] ?? '';
}

/**
 * El tope de usuarios del plan cuenta SÓLO asesores comerciales (AGENTE):
 * `assertCanAddAgente` en el back. Un administrador, un contador o un lector
 * no lo suben (01-10-2026, Alexis).
 */
export function cuentaParaElTope(rol: AgencyRole): boolean {
  return rol === 'agente';
}
