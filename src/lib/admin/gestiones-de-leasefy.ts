/**
 * Las gestiones de Leasefy (MODELO-DE-NEGOCIO.md §3.11; Nico, 27-10-2026: «construirlo apagado»): Leasefy gestiona el
 * inmueble de un propietario sin inmobiliaria y cobra el 5 % de lo recaudado. Back `/api/v1/admin/gestiones-de-leasefy`.
 */

export interface GestionDeLeasefy {
  id: string
  propertyId: string
  landlordId: string
  porcentajeBps: number
  desde: string
  hasta: string | null
  notas: string | null
  inmueble: string | null
  propietario: string | null
  cobradoCop: number
  comisionCop: number
  netoCop: number
}

export interface RespuestaDeGestiones {
  /** La llave COBRO_PROPIETARIO_DIRECTO del back. Apagada: la lista sale vacía y escribir es un 409. */
  prendido: boolean
  disponible: boolean
  migracion?: string | null
  mes: string
  porcentajeBps: number
  gestiones: GestionDeLeasefy[]
  totales: { cobradoCop: number; comisionCop: number; netoCop: number }
}

/** 500 → «5 %»; 750 → «7,5 %». */
export function porcentajeDeLaGestion(bps: number): string {
  const p = bps / 100
  return `${p.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`
}

/** `2026-10` → «octubre de 2026». */
export function nombreDelMesDeLaGestion(mes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) return mes
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 15))
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(fecha)
}

/** El mes de antes o el de después (`2026-01` − 1 = `2025-12`). */
export function moverElMes(mes: string, cuanto: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) return mes
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + cuanto, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** El mes de hoy en Colombia (UTC−5). */
export function mesDeHoyEnColombia(ahora = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3_600_000).toISOString().slice(0, 7)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const esIdDeInmueble = (v: string) => UUID.test(v.trim())
