/**
 * PQRS de la inmobiliaria — el contrato real del back (`/inmobiliaria/pqrs`, 2026-09-03).
 *
 * Antes este archivo era un contrato «frontend-first» sin nada detrás: la
 * pantalla mostraba ceros y el botón «Nueva solicitud» avisaba que llegaría
 * con el motor (Nico: «cuando le doy nueva solicitud no deja»). Ahora radica,
 * asigna y mueve de estado de verdad. El triage automático sigue siendo del
 * agente, cuando exista.
 */

export type PqrsTipo = 'PETICION' | 'QUEJA' | 'RECLAMO' | 'SOLICITUD';
export type PqrsSolicitante = 'INQUILINO' | 'PROPIETARIO' | 'TERCERO';
export type PqrsEstado =
  | 'RECIBIDA'
  | 'ASIGNADA'
  | 'EN_PROCESO'
  | 'EN_COTIZACION'
  | 'RESUELTA'
  | 'CERRADA';

export const PQRS_TIPOS: PqrsTipo[] = ['PETICION', 'QUEJA', 'RECLAMO', 'SOLICITUD'];
export const PQRS_SOLICITANTES: PqrsSolicitante[] = ['INQUILINO', 'PROPIETARIO', 'TERCERO'];
export const PQRS_ESTADOS: PqrsEstado[] = [
  'RECIBIDA',
  'ASIGNADA',
  'EN_PROCESO',
  'EN_COTIZACION',
  'RESUELTA',
  'CERRADA',
];

export interface Pqrs {
  id: string;
  numero: number;
  /** «PQRS-0007» */
  radicado: string;
  tipo: PqrsTipo;
  solicitanteTipo: PqrsSolicitante;
  solicitanteNombre: string;
  solicitanteContacto: string | null;
  asunto: string;
  descripcion: string | null;
  consignacionId: string | null;
  inmuebleLabel: string | null;
  asignadoAUserId: string | null;
  asignadoANombre: string | null;
  estado: PqrsEstado;
  /** ISO. 15 días hábiles desde el radicado (Ley 1755 de 2015, art. 14). */
  slaVenceAt: string;
  resueltaAt: string | null;
  cerradaAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumenPqrs {
  total: number;
  recibidas: number;
  asignadas: number;
  enProceso: number;
  enCotizacion: number;
  resueltas: number;
  cerradas: number;
}

export interface PqrsListResponse {
  resumen: ResumenPqrs;
  solicitudes: Pqrs[];
}

export interface CrearPqrsInput {
  tipo: PqrsTipo;
  solicitanteTipo: PqrsSolicitante;
  solicitanteNombre: string;
  solicitanteContacto?: string;
  asunto: string;
  descripcion?: string;
  consignacionId?: string;
  asignadoAUserId?: string;
}

export interface ActualizarPqrsInput {
  estado?: PqrsEstado;
  /** `null` desasigna. */
  asignadoAUserId?: string | null;
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

/** Días que faltan para el SLA (negativo = vencido). Días calendario, redondeados hacia arriba. */
export function diasParaElSla(slaVenceAt: string, ahora = new Date()): number {
  const ms = new Date(slaVenceAt).getTime() - ahora.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
