import { adminApi } from './api'
import type { Paginated } from './types'

/**
 * Historial interno del inmueble (riesgo y rentabilidad) — contrato de
 * `GET /api/v1/admin/inmuebles` y `GET /api/v1/admin/inmuebles/:id/historial`
 * (back, `src/admin/resources/inmuebles/`). 🔴 Es información interna de
 * Leasefy: sólo existe en el backoffice, nunca en `/panel` (Nico, 2026-09-12).
 *
 * Las fechas viajan como día calendario `YYYY-MM-DD`; los montos en COP enteros.
 */

export type EstadoDeContrato =
  | 'DRAFT'
  | 'PENDING_LANDLORD_SIGNATURE'
  | 'PENDING_TENANT_SIGNATURE'
  | 'REJECTED_PENDING_MODIFICATIONS'
  | 'SIGNED'
  | 'ACTIVE'
  | 'CANCELLED'
  | 'EXPIRED'

export type EstadoDeInmueble = 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'PENDING' | 'RESERVED'

export type TipoDeReparacion =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'APPLIANCE'
  | 'STRUCTURAL'
  | 'PAINTING'
  | 'LOCKS'
  | 'OTHER_MAINT'

export type PrioridadDeReparacion = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'

export type EstadoDeReparacion =
  | 'REPORTED'
  | 'QUOTED'
  | 'MAINT_APPROVED'
  | 'IN_PROGRESS'
  | 'MAINT_COMPLETED'
  | 'MAINT_CANCELLED'

export type QuienPaga = 'OWNER' | 'TENANT_PAYS' | 'SPLIT' | 'AGENCY_PAYS'

export type NivelDeRiesgo = 'sin_datos' | 'bajo' | 'medio' | 'alto'

export interface InmuebleAdminRow {
  id: string
  code: number
  externalId: string | null
  address: string
  city: string
  status: EstadoDeInmueble
  agencia: { id: string; name: string } | null
  contratos: number
  activos: number
  reparaciones: number
}

export interface ContratoDelHistorial {
  id: string
  code: number
  externalId: string | null
  status: EstadoDeContrato
  inicio: string | null
  fin: string | null
  duracionDias: number | null
  canon: number | null
  arrendo: boolean
}

export interface VacanciaDelHistorial {
  desde: string
  hasta: string
  dias: number
  entreContratos: [number, number]
}

export interface ReparacionDelHistorial {
  id: string
  tipo: TipoDeReparacion
  prioridad: PrioridadDeReparacion
  estado: EstadoDeReparacion
  titulo: string
  creada: string
  completada: string | null
  montoAprobado: number | null
  pagaQuien: QuienPaga
}

export interface ReparacionPorTipo {
  tipo: TipoDeReparacion
  cantidad: number
  primera: string
  ultima: string
  cadaDias: number | null
  recurrente: boolean
}

export interface SenalDeRiesgo {
  clave: string
  texto: string
  puntos: number
}

export interface HistorialDelInmueble {
  inmueble: {
    id: string
    code: number
    externalId: string | null
    address: string
    city: string
    status: EstadoDeInmueble
    canonPublicado: number | null
    consignadoEl: string | null
    creadoEl: string
    agencia: { id: string; name: string } | null
  }
  contratos: {
    total: number
    activos: number
    terminados: number
    cancelados: number
    sinArrancar: number
    vecesArrendado: number
    duracionPromedioDias: number | null
    rotacionPorAno: number | null
    lista: ContratoDelHistorial[]
  }
  ocupacion: {
    desde: string | null
    diasObservados: number
    diasOcupado: number
    diasDesocupado: number
    porcentajeDesocupado: number | null
    vacancias: VacanciaDelHistorial[]
    vacanciaPromedioDias: number | null
    desocupadoAhora: boolean
    diasDesocupadoActual: number
  }
  reparaciones: {
    total: number
    ultimos12Meses: number
    emergencias: number
    montoAprobadoTotal: number
    porTipo: ReparacionPorTipo[]
    lista: ReparacionDelHistorial[]
  }
  canon: {
    inicial: number | null
    actual: number | null
    variacionPct: number | null
  }
  riesgo: {
    nivel: NivelDeRiesgo
    puntaje: number
    senales: SenalDeRiesgo[]
  }
}

export interface ListarInmueblesQuery {
  q?: string
  agencyId?: string
  page?: number
}

export function listarInmuebles(
  query: ListarInmueblesQuery,
  signal?: AbortSignal,
): Promise<Paginated<InmuebleAdminRow>> {
  return adminApi('/inmuebles', {
    query: {
      q: query.q || undefined,
      agencyId: query.agencyId || undefined,
      page: query.page || undefined,
    },
    signal,
  })
}

export function historialDelInmueble(
  id: string,
  signal?: AbortSignal,
): Promise<HistorialDelInmueble> {
  return adminApi(`/inmuebles/${encodeURIComponent(id)}/historial`, { signal })
}

// ---------- Rótulos en español ----------

export const ESTADO_DE_CONTRATO: Record<EstadoDeContrato, string> = {
  DRAFT: 'Borrador',
  PENDING_LANDLORD_SIGNATURE: 'Espera firma del propietario',
  PENDING_TENANT_SIGNATURE: 'Espera firma del inquilino',
  REJECTED_PENDING_MODIFICATIONS: 'Con cambios pedidos',
  SIGNED: 'Firmado',
  ACTIVE: 'Activo',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Terminado',
}

export const ESTADO_DE_INMUEBLE: Record<EstadoDeInmueble, string> = {
  DRAFT: 'Borrador',
  AVAILABLE: 'Disponible',
  RENTED: 'Arrendado',
  PENDING: 'Pendiente',
  RESERVED: 'Reservado',
}

export const TIPO_DE_REPARACION: Record<TipoDeReparacion, string> = {
  PLUMBING: 'Plomería / humedad',
  ELECTRICAL: 'Eléctrico',
  APPLIANCE: 'Electrodomésticos',
  STRUCTURAL: 'Estructural',
  PAINTING: 'Pintura',
  LOCKS: 'Cerrajería',
  OTHER_MAINT: 'Otro',
}

export const PRIORIDAD_DE_REPARACION: Record<PrioridadDeReparacion, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  EMERGENCY: 'Emergencia',
}

export const ESTADO_DE_REPARACION: Record<EstadoDeReparacion, string> = {
  REPORTED: 'Reportada',
  QUOTED: 'Cotizada',
  MAINT_APPROVED: 'Aprobada',
  IN_PROGRESS: 'En curso',
  MAINT_COMPLETED: 'Completada',
  MAINT_CANCELLED: 'Cancelada',
}

export const QUIEN_PAGA: Record<QuienPaga, string> = {
  OWNER: 'Propietario',
  TENANT_PAYS: 'Inquilino',
  SPLIT: 'Compartido',
  AGENCY_PAYS: 'Inmobiliaria',
}

export const NIVEL_DE_RIESGO: Record<NivelDeRiesgo, string> = {
  sin_datos: 'Sin datos',
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
}
