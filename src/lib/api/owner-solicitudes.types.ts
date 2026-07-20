/**
 * Portal del Propietario — tipos de solicitudes (F4, v8-04).
 *
 * Shapes EXACTOS del back (`portal-propietario-solicitudes.ts`, schemas `PortalSolicitud*`).
 *
 * ⚠️ Anti-PII (LEGAL Q5): el `llamado` del timeline es MÍNIMO — sólo `{ situationKey, at }`, sin
 * notas ni emisor. El front lo muestra tal cual.
 * ⚠️ Debido proceso: el front NUNCA computa ni sugiere "terminación elegible" — sólo muestra la
 * línea de tiempo. La decisión de terminar es humana (agencia).
 */

/** Tipos de solicitud (REQUEST_TYPES del back). */
export type SolicitudTipo =
  | 'ruido'
  | 'mascotas'
  | 'numero_personas'
  | 'convivencia'
  | 'no_renovar'
  | 'reubicacion'
  | 'otra';

/** Estados de solicitud (REQUEST_STATUSES del back). */
export type SolicitudStatus =
  | 'recibida'
  | 'en_gestion'
  | 'esperando_verificacion'
  | 'resuelta'
  | 'cerrada'
  | 'rechazada';

/** Opciones para el selector de tipo (value + label español). */
export const REQUEST_TYPE_OPTIONS: Array<{ value: SolicitudTipo; label: string }> = [
  { value: 'ruido', label: 'Ruido' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'numero_personas', label: 'Número de personas' },
  { value: 'convivencia', label: 'Convivencia' },
  { value: 'no_renovar', label: 'No renovar contrato' },
  { value: 'reubicacion', label: 'Reubicación' },
  { value: 'otra', label: 'Otra' },
];

/** Etiqueta legible de un estado. */
export const STATUS_LABELS: Record<string, string> = {
  recibida: 'Recibida',
  en_gestion: 'En gestión',
  esperando_verificacion: 'Esperando verificación',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
  rechazada: 'Rechazada',
};

/** `GET /solicitudes` / `POST /solicitudes` — una solicitud. */
export interface Solicitud {
  id: string;
  propertyRef: string;
  contractRef: string | null;
  tipo: string;
  descripcion: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Entrada de timeline: evento de gestión. */
export interface TimelineEvento {
  kind: 'evento';
  at: string;
  tipo: string;
  from?: string;
  to?: string;
  rejectionReason?: string;
  motivo?: string;
}

/** Entrada de timeline: llamado de atención (mínimo — anti-PII). */
export interface TimelineLlamado {
  kind: 'llamado';
  at: string;
  situationKey: string;
}

export type TimelineEntry = TimelineEvento | TimelineLlamado;

/** `GET /solicitudes/{id}` — solicitud + timeline. */
export interface SolicitudDetalle extends Solicitud {
  timeline: TimelineEntry[];
}

/** Body de `POST /solicitudes`. */
export interface CrearSolicitudBody {
  propertyRef: string;
  tipo: SolicitudTipo;
  descripcion: string;
}
