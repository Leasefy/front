/**
 * El acta de entrega entre el panel y el back (02-10-2026).
 *
 * 🔴 «Crear un acta desde el panel parece roto» (Nico). Lo era: el formulario
 * mandaba un `ActaEntrega` entero —con `id: ''`, `status`, `createdAt`, una
 * cédula, un teléfono y un correo de mentira para el inquilino, la fecha de la
 * entrega— y `CreateActaDto` no acepta nada de eso. Con `forbidNonWhitelisted`
 * el alta entera respondía 400, siempre. Además el tipo y el estado general
 * viajaban en el vocabulario del panel (`entrega`, `bueno`) y el back espera
 * el suyo (`ENTREGA`, `GOOD`).
 *
 * Acá viven las dos traducciones, en un solo lugar:
 *  · `cuerpoParaCrearElActa`: lo que el formulario levantó → EXACTAMENTE lo
 *    que acepta `CreateActaDto` (que ahora también recibe espacios, inventario,
 *    medidores, llaves y descuentos: es lo que el formulario necesita);
 *  · `actaDelBack`: lo que devuelve el back → lo que pinta el panel (tipo,
 *    estado y estado general en su vocabulario; la fecha, la del acta).
 *
 * 🔁 El back fija este mismo cuerpo, literal, en
 * `actas/crear-un-acta-desde-el-panel.spec.ts`: si cambias uno, cambia el otro.
 *
 * La fecha y la hora de la entrega (Nico, 02-10-2026) van en `fechaDeEntrega`:
 * el día y la hora del primer paso, en la hora de Colombia (`-05:00`). El back
 * la guarda si la base ya tiene la columna; la lista la muestra y, si viene
 * vacía, muestra la fecha de creación.
 *
 * Lo que NO se manda, a propósito:
 *  · el asesor del mandato: si ya no es miembro activo, el back rechaza el alta
 *    (`NO_ES_MIEMBRO_ACTIVO`) por algo que la persona no puede corregir acá;
 *  · las firmas: se firman después, por su propia ruta.
 */

import type {
  ActaEntrega,
  ActaType,
  Consignacion,
  ItemCondition,
} from '@/lib/types/inmobiliaria'
import { descuentoVacio } from './limites-del-acta'
import { liquidarElDeposito } from './devolucion-del-deposito'

type TipoDelBack = 'ENTREGA' | 'DEVOLUCION'
type CondicionDelBack = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
type EstadoDelBack = 'ACTA_DRAFT' | 'ACTA_IN_PROGRESS' | 'PENDING_SIGNATURES' | 'ACTA_COMPLETED'

/** El cuerpo de `POST /inmobiliaria/actas`: las claves de `CreateActaDto`, ni una más. */
export interface CuerpoParaCrearElActa {
  type: TipoDelBack
  propietarioId: string
  consignacionId: string
  leaseId?: string
  propertyTitle: string
  propertyAddress: string
  tenantName?: string
  generalCondition?: CondicionDelBack
  generalObservations?: string
  depositAmount?: number
  rooms: unknown[]
  items: unknown[]
  meterReadings: unknown[]
  keysDelivered: unknown[]
  deductions?: Array<{ concept: string; amount: number; notes?: string }>
  depositToReturn?: number
  /** El instante de la entrega, con la zona de Colombia: `2026-10-02T10:00:00-05:00`. */
  fechaDeEntrega?: string
}

/** Lo que el formulario levantó (los pasos de `ActaEntregaSteps`). */
export interface LoQueSeLevanto {
  type: ActaType
  rooms: unknown[]
  items: unknown[]
  meterReadings: unknown[]
  keysDelivered: unknown[]
  generalCondition: ItemCondition
  generalObservations: string
  depositAmount?: number
  deductions?: Array<{ concept: string; amount: number; notes?: string }>
  /** El día de la entrega (`AAAA-MM-DD`) y la hora (`HH:MM`), del primer paso. */
  deliveryDate?: string
  deliveryTime?: string
}

// ── La fecha y la hora de la entrega, en la hora de Colombia ────────────────

const ZONA = 'America/Bogota'
const DIA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** El día y la hora de un instante, en Colombia. `null` si no es un instante. */
export function diaYHoraEnBogota(iso: string): { dia: string; hora: string } | null {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  )
  return { dia: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` }
}

/**
 * Hoy en Colombia, `AAAA-MM-DD`. `new Date().toISOString()` da el día en UTC:
 * desde las 7 p. m. ya es «mañana» y el asistente proponía el día equivocado.
 */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return diaYHoraEnBogota(ahora.toISOString())?.dia ?? ahora.toISOString().slice(0, 10)
}

/**
 * El día y la hora del asistente como el instante que acepta el back (Colombia
 * no tiene horario de verano: siempre `-05:00`). Sin un día y una hora válidos,
 * `undefined` (no se manda).
 */
export function fechaDeEntregaParaElBack(dia?: string, hora?: string): string | undefined {
  if (!dia || !hora || !DIA.test(dia) || !HORA.test(hora)) return undefined
  return `${dia}T${hora}:00-05:00`
}

/** ¿El asistente tiene una hora válida (`HH:MM`)? */
export function esHoraDeEntrega(hora?: string): boolean {
  return typeof hora === 'string' && HORA.test(hora)
}

/**
 * Cuándo fue la entrega, para la lista: «02 oct 2026 · 10:00 a. m.» si el acta
 * guardó la hora; si no (la fecha de creación), sólo el día. El día es CIVIL
 * (`AAAA-MM-DD`): se pinta sin convertir de zona, porque `new Date('2026-10-02')`
 * es la medianoche UTC y en Colombia se veía el 1 de octubre.
 */
export function cuandoFueLaEntrega(
  acta: { deliveryDate?: string; deliveryTime?: string },
  locale: string,
): string {
  const dia = acta.deliveryDate ?? ''
  if (!DIA.test(dia)) return '—'
  const [anio, mes, d] = dia.split('-').map(Number)
  const idioma = locale === 'es' ? 'es-CO' : 'en-US'
  const fecha = new Date(Date.UTC(anio, mes - 1, d, 12)).toLocaleDateString(idioma, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  if (!esHoraDeEntrega(acta.deliveryTime)) return fecha
  const [hora, minuto] = (acta.deliveryTime as string).split(':').map(Number)
  const aLas = new Date(Date.UTC(2000, 0, 1, hora, minuto)).toLocaleTimeString(idioma, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `${fecha} · ${aLas}`
}

const TIPO_AL_BACK: Record<ActaType, TipoDelBack> = {
  entrega: 'ENTREGA',
  devolucion: 'DEVOLUCION',
}

/** `no_aplica` no es un estado de un inmueble: no se manda (el back pone el suyo). */
const CONDICION_AL_BACK: Record<ItemCondition, CondicionDelBack | undefined> = {
  excelente: 'EXCELLENT',
  bueno: 'GOOD',
  regular: 'FAIR',
  malo: 'POOR',
  no_aplica: undefined,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function cuerpoParaCrearElActa(
  levantado: LoQueSeLevanto,
  mandato: Consignacion,
): CuerpoParaCrearElActa {
  const condicion = CONDICION_AL_BACK[levantado.generalCondition]
  const observaciones = levantado.generalObservations.trim()
  const leaseId = mandato.currentLeaseId
  const descuentos = (levantado.deductions ?? [])
    .filter((d) => !descuentoVacio(d))
    .map((d) => ({
      concept: d.concept.trim(),
      amount: d.amount,
      ...(d.notes?.trim() ? { notes: d.notes.trim() } : {}),
    }))
  const deposito = levantado.depositAmount
  const hayDeposito = typeof deposito === 'number' && deposito > 0
  const fechaDeEntrega = fechaDeEntregaParaElBack(levantado.deliveryDate, levantado.deliveryTime)

  return {
    type: TIPO_AL_BACK[levantado.type],
    propietarioId: mandato.propietarioId,
    consignacionId: mandato.id,
    ...(leaseId && UUID.test(leaseId) ? { leaseId } : {}),
    propertyTitle: mandato.propertyTitle,
    propertyAddress: mandato.propertyAddress ?? '',
    ...(mandato.currentTenantName?.trim() ? { tenantName: mandato.currentTenantName.trim() } : {}),
    ...(condicion ? { generalCondition: condicion } : {}),
    ...(observaciones ? { generalObservations: observaciones } : {}),
    ...(hayDeposito ? { depositAmount: deposito } : {}),
    rooms: levantado.rooms,
    items: levantado.items,
    meterReadings: levantado.meterReadings,
    keysDelivered: levantado.keysDelivered,
    ...(descuentos.length > 0 ? { deductions: descuentos } : {}),
    // Nunca negativo (Nico, 02-10-2026); el back lo vuelve a calcular igual.
    ...(hayDeposito ? { depositToReturn: liquidarElDeposito(deposito, descuentos).aDevolverCop } : {}),
    ...(fechaDeEntrega ? { fechaDeEntrega } : {}),
  }
}

// ── Lo que devuelve el back → lo que pinta el panel ────────────────────────

const TIPO_DEL_BACK: Record<string, ActaType> = { ENTREGA: 'entrega', DEVOLUCION: 'devolucion' }

const ESTADO_DEL_BACK: Record<EstadoDelBack, ActaEntrega['status']> = {
  ACTA_DRAFT: 'draft',
  ACTA_IN_PROGRESS: 'in_progress',
  PENDING_SIGNATURES: 'pending_signatures',
  ACTA_COMPLETED: 'completed',
}

const CONDICION_DEL_BACK: Record<CondicionDelBack, ItemCondition> = {
  EXCELLENT: 'excelente',
  GOOD: 'bueno',
  FAIR: 'regular',
  POOR: 'malo',
  // El panel no tiene «dañado»: lo más cercano que sabe pintar es «malo».
  DAMAGED: 'malo',
}

/**
 * La fila del back en el vocabulario del panel. Lo que ya viene en el
 * vocabulario del panel (o no se reconoce) pasa tal cual: nunca se inventa.
 */
export function actaDelBack(fila: unknown): ActaEntrega {
  const a = (fila ?? {}) as Record<string, unknown> & Partial<ActaEntrega>
  const tipo = typeof a.type === 'string' ? (TIPO_DEL_BACK[a.type] ?? a.type) : a.type
  const estado =
    typeof a.status === 'string' ? (ESTADO_DEL_BACK[a.status as EstadoDelBack] ?? a.status) : a.status
  const condicion =
    typeof a.generalCondition === 'string'
      ? (CONDICION_DEL_BACK[a.generalCondition as CondicionDelBack] ?? a.generalCondition)
      : a.generalCondition
  // 🔴 La fecha de la entrega (02-10-2026): la que guardó el back, en la hora de
  // Colombia; si viene vacía (actas de antes, o la base sin la columna), la de
  // creación — también en Colombia: cortar el ISO daba el día UTC, uno de más
  // para lo creado después de las 7 p. m.
  const entrega = typeof a.fechaDeEntrega === 'string' ? diaYHoraEnBogota(a.fechaDeEntrega) : null
  const creada = typeof a.createdAt === 'string' ? diaYHoraEnBogota(a.createdAt)?.dia : undefined
  return {
    ...(a as ActaEntrega),
    type: tipo as ActaType,
    status: estado as ActaEntrega['status'],
    generalCondition: condicion as ItemCondition,
    deliveryDate: entrega?.dia || (typeof a.deliveryDate === 'string' && a.deliveryDate) || creada || '',
    deliveryTime: entrega?.hora ?? (typeof a.deliveryTime === 'string' ? a.deliveryTime : undefined),
    rooms: Array.isArray(a.rooms) ? a.rooms : [],
    items: Array.isArray(a.items) ? a.items : [],
    meterReadings: Array.isArray(a.meterReadings) ? a.meterReadings : [],
    keysDelivered: Array.isArray(a.keysDelivered) ? a.keysDelivered : [],
    signatures: Array.isArray(a.signatures) ? a.signatures : [],
    deductions: Array.isArray(a.deductions) ? a.deductions : undefined,
    depositAmount: typeof a.depositAmount === 'number' ? a.depositAmount : undefined,
    depositToReturn: typeof a.depositToReturn === 'number' ? a.depositToReturn : undefined,
  }
}

// ── El cargo aparte al cerrar el acta ──────────────────────────────────────

/**
 * Lo que el back responde al CERRAR un acta de devolución (Nico, 02-10-2026):
 * qué pasó con lo que los descuentos pasan del depósito. `CREADO` = entró al
 * estado de cuenta del inquilino en una cuota sin pagar; `CUOTA_DE_CIERRE` =
 * el contrato ya no tenía cuotas sin pagar y entró en una CUOTA DE CIERRE que
 * vence 5 días después del cierre (`vence`); cualquier otro = quedó sólo
 * mostrado. `mensaje` dice qué pasó (va tal cual a la persona).
 */
export interface CargoAparteDelCierre {
  estado:
    | 'CREADO'
    | 'CUOTA_DE_CIERRE'
    | 'SIN_MIGRACION'
    | 'SIN_CONTRATO'
    | 'SIN_CUOTA_SIN_PAGAR'
    | 'FUERA_DE_RANGO'
  valorCop: number
  mensaje: string
  /** `AAAA-MM-DD`: cuándo vence la cuota de cierre. Sólo en `CUOTA_DE_CIERRE`. */
  vence: string | null
}

const ESTADOS_DEL_CARGO = new Set<string>([
  'CREADO',
  'CUOTA_DE_CIERRE',
  'SIN_MIGRACION',
  'SIN_CONTRATO',
  'SIN_CUOTA_SIN_PAGAR',
  'FUERA_DE_RANGO',
])

/** ¿El cargo ENTRÓ al estado de cuenta del inquilino? Es el aviso verde. */
export function elCargoEntro(cargo: CargoAparteDelCierre): boolean {
  return cargo.estado === 'CREADO' || cargo.estado === 'CUOTA_DE_CIERRE'
}

/** El cargo aparte que trae la respuesta del cierre, o `null` (no había nada que cargar). */
export function cargoAparteDelCierre(respuesta: unknown): CargoAparteDelCierre | null {
  const c = (respuesta as { cargoAparte?: unknown } | null)?.cargoAparte as
    | Partial<CargoAparteDelCierre>
    | null
    | undefined
  if (!c || typeof c !== 'object') return null
  if (typeof c.estado !== 'string' || !ESTADOS_DEL_CARGO.has(c.estado)) return null
  if (typeof c.valorCop !== 'number' || typeof c.mensaje !== 'string' || !c.mensaje.trim()) return null
  const vence =
    c.estado === 'CUOTA_DE_CIERRE' && typeof c.vence === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.vence)
      ? c.vence
      : null
  return { estado: c.estado, valorCop: c.valorCop, mensaje: c.mensaje, vence }
}
