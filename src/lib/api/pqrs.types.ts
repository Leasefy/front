/**
 * PQRS / Solicitudes — contrato de tipos (v6-06, frontend-first).
 *
 * Ciclo registro → asignación → seguimiento → cierre de cualquier solicitud
 * (petición, queja, reclamo, sugerencia, solicitud o reparación) de inquilinos,
 * propietarios o terceros. El triage automático (clasificación, prioridad, SLA y
 * notificaciones) lo hará el agente de IA (Mastra en `agent`) en la fase de
 * backend (M1). Una reparación puede derivar al flujo de cotización con proveedor
 * (→ Operaciones). UI con estado vacío honesto; NO hay data falsa hasta que exista
 * el motor.
 */

export type PqrsTipo = 'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'solicitud' | 'reparacion';

export type PqrsEstado =
  | 'recibida'        // radicada, sin asignar
  | 'asignada'        // con responsable
  | 'en_proceso'      // en gestión
  | 'en_cotizacion'   // reparación derivada a cotización (PQRS-03)
  | 'resuelta'        // con respuesta, pendiente de cierre
  | 'cerrada';        // ciclo terminado

export type PqrsPrioridad = 'baja' | 'media' | 'alta' | 'urgente';

export type PqrsCanal = 'whatsapp' | 'email' | 'web' | 'telefono' | 'presencial';

export type PqrsSolicitanteTipo = 'inquilino' | 'propietario' | 'tercero';

/** Una solicitud/PQRS con su ciclo de vida completo. */
export interface SolicitudPqrs {
  id: string;
  radicado: string;            // consecutivo legible, p.ej. 'PQRS-2026-0001'
  tipo: PqrsTipo;
  estado: PqrsEstado;
  prioridad: PqrsPrioridad;
  canal: PqrsCanal;
  asunto: string;
  descripcion: string;
  solicitanteNombre: string;
  solicitanteTipo: PqrsSolicitanteTipo;
  contratoId?: string;
  contratoLabel?: string;
  propiedadId?: string;
  propiedadDireccion?: string;
  responsableId?: string;      // asignación (PQRS-02)
  responsableNombre?: string;
  respuesta?: string;          // respuesta registrada al cierre (PQRS-01)
  cotizacionId?: string;       // cuando una reparación pasa a cotización (PQRS-03)
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
  resueltaAt?: string;         // ISO
  slaVenceAt?: string;         // ISO — SLA que calculará el motor (M1)
}

/** Conteos por estado para el resumen del ciclo PQRS. */
export interface ResumenPqrs {
  total: number;
  recibidas: number;
  asignadas: number;
  enProceso: number;
  enCotizacion: number;
  resueltas: number;
  cerradas: number;
}

/** Contrato del listado paginado que el motor (M1) devolverá. */
export interface PqrsListResponse {
  resumen: ResumenPqrs;
  items: SolicitudPqrs[];
  total: number;
}

export const RESUMEN_PQRS_VACIO: ResumenPqrs = {
  total: 0,
  recibidas: 0,
  asignadas: 0,
  enProceso: 0,
  enCotizacion: 0,
  resueltas: 0,
  cerradas: 0,
};
