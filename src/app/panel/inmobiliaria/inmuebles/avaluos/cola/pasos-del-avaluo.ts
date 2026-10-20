/**
 * En qué paso va un avalúo, leído de su estado (el conjunto cerrado del micro de
 * avalúos: borrador | en_revisión | firmado | rechazado | entregado).
 *
 * Los cuatro pasos que ve la inmobiliaria: lo pidió → un revisor de Leasefy lo
 * revisa → lo firma → se entrega. «Borrador» es la estimación ya hecha que espera
 * al revisor; «rechazado» termina en el paso de la revisión.
 */

export const PASOS_DEL_AVALUO = ['solicitado', 'enRevision', 'firmado', 'entregado'] as const

export type PasoDelAvaluo = (typeof PASOS_DEL_AVALUO)[number]

export interface AvanceDelAvaluo {
  /** Cuántos pasos están hechos (0 a 4), en orden. */
  hechos: number
  /** El paso en el que está ahora (o `null` si ya terminó). */
  actual: PasoDelAvaluo | null
  /** Terminó rechazado: el paso actual es la revisión y no sigue. */
  rechazado: boolean
}

/** Los que todavía esperan algo de Leasefy: cuentan como «activas». */
export const ESTADOS_ACTIVOS: readonly string[] = ['borrador', 'en_revisión']

export function avanceDelAvaluo(estado: string): AvanceDelAvaluo {
  switch (estado) {
    case 'firmado':
      return { hechos: 3, actual: 'entregado', rechazado: false }
    case 'entregado':
      return { hechos: 4, actual: null, rechazado: false }
    case 'rechazado':
      return { hechos: 1, actual: 'enRevision', rechazado: true }
    case 'borrador':
    case 'en_revisión':
    default:
      // Un estado que no conocemos: se sabe que se pidió, nada más.
      return { hechos: 1, actual: 'enRevision', rechazado: false }
  }
}
