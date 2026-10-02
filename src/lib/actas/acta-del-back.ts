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
 * Lo que NO se manda, a propósito:
 *  · la fecha y la hora de la entrega: el acta no tiene dónde guardarlas (no
 *    hay columna); el acta queda con su fecha de creación;
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
  const creada = typeof a.createdAt === 'string' ? a.createdAt.slice(0, 10) : undefined
  return {
    ...(a as ActaEntrega),
    type: tipo as ActaType,
    status: estado as ActaEntrega['status'],
    generalCondition: condicion as ItemCondition,
    // El acta no guarda la fecha de la entrega: la de la fila es la de creación.
    deliveryDate: (typeof a.deliveryDate === 'string' && a.deliveryDate) || creada || '',
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
