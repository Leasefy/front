/**
 * El puente entre los enums del back (MAYÚSCULAS, con prefijos para no chocar
 * en Prisma: `OTHER_MAINT`, `MAINT_APPROVED`, `TENANT_PAYS`) y los del front
 * (minúsculas, que es lo que comparan la lista y el tablero).
 *
 * Sin esto, crear una solicitud daba 400 (`type must be one of…`) y la lista
 * nunca coincidía con ninguna columna del tablero.
 */
import type {
  MantenimientoPaidBy,
  MantenimientoPriority,
  MantenimientoStatus,
  MantenimientoType,
  SolicitudMantenimiento,
} from '@/lib/types/inmobiliaria';

export const TIPO_AL_BACK: Record<MantenimientoType, string> = {
  plumbing: 'PLUMBING',
  electrical: 'ELECTRICAL',
  appliance: 'APPLIANCE',
  structural: 'STRUCTURAL',
  painting: 'PAINTING',
  locks: 'LOCKS',
  other: 'OTHER_MAINT',
};

export const PRIORIDAD_AL_BACK: Record<MantenimientoPriority, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  emergency: 'EMERGENCY',
};

export const PAGADOR_AL_BACK: Record<MantenimientoPaidBy, string> = {
  owner: 'OWNER',
  tenant: 'TENANT_PAYS',
  split: 'SPLIT',
  agency: 'AGENCY_PAYS',
};

export const ESTADO_AL_BACK: Record<MantenimientoStatus, string> = {
  reported: 'REPORTED',
  quoted: 'QUOTED',
  approved: 'MAINT_APPROVED',
  in_progress: 'IN_PROGRESS',
  completed: 'MAINT_COMPLETED',
  cancelled: 'MAINT_CANCELLED',
};

function invertir<K extends string>(tabla: Record<K, string>): Record<string, K> {
  return Object.fromEntries(Object.entries(tabla).map(([k, v]) => [v, k])) as Record<string, K>;
}

const TIPO_AL_FRONT = invertir(TIPO_AL_BACK);
const PRIORIDAD_AL_FRONT = invertir(PRIORIDAD_AL_BACK);
const PAGADOR_AL_FRONT = invertir(PAGADOR_AL_BACK);
const ESTADO_AL_FRONT = invertir(ESTADO_AL_BACK);

/** Lo que el front manda al crear o editar, con los enums en el vocabulario del back. */
export function mantenimientoAlBack<T extends Partial<SolicitudMantenimiento>>(
  data: T,
): Record<string, unknown> {
  const salida: Record<string, unknown> = { ...data };
  if (data.type) salida.type = TIPO_AL_BACK[data.type] ?? data.type;
  if (data.priority) salida.priority = PRIORIDAD_AL_BACK[data.priority] ?? data.priority;
  if (data.paidBy) salida.paidBy = PAGADOR_AL_BACK[data.paidBy] ?? data.paidBy;
  if (data.status) salida.status = ESTADO_AL_BACK[data.status] ?? data.status;
  return salida;
}

/** Una fila del back, con los enums como los lee la pantalla. Lo ya traducido pasa igual. */
export function mantenimientoDelBack(raw: SolicitudMantenimiento): SolicitudMantenimiento {
  const r = raw as unknown as Record<string, unknown>;
  return {
    ...raw,
    type: (TIPO_AL_FRONT[String(r.type)] ?? raw.type) as MantenimientoType,
    priority: (PRIORIDAD_AL_FRONT[String(r.priority)] ?? raw.priority) as MantenimientoPriority,
    paidBy: (PAGADOR_AL_FRONT[String(r.paidBy)] ?? raw.paidBy) as MantenimientoPaidBy,
    status: (ESTADO_AL_FRONT[String(r.status)] ?? raw.status) as MantenimientoStatus,
    quotes: raw.quotes ?? [],
  };
}
