/**
 * Discriminar la cartera por edad de la deuda.
 *
 * ── Por qué esto no se toma del `summary` del back ──────────────────────────
 *
 * El back agrupa con `daysLate <= 30 → bucket0to30`, y `daysLate` es
 * `max(0, hoy - vencimiento)`. Eso mete en el mismo balde un cobro que **aún no
 * venció** y uno con 29 días de mora. Son cosas distintas: lo primero es plata
 * que va a entrar, lo segundo es plata que hay que salir a buscar. Sumarlas da
 * una mora inflada, y una mora inflada todos los meses enseña a ignorarla.
 *
 * Acá se separan, y «por vencer» no cuenta como mora.
 */

import type { CarteraItem } from '@/lib/types/inmobiliaria'

export type Edad = 'por_vencer' | '1-30' | '31-60' | '61-90' | '90+'

export const EDADES: Edad[] = ['por_vencer', '1-30', '31-60', '61-90', '90+']

export const NOMBRE_DE_EDAD: Record<Edad, string> = {
  por_vencer: 'Por vencer',
  '1-30': '1 a 30 días',
  '31-60': '31 a 60 días',
  '61-90': '61 a 90 días',
  '90+': 'Más de 90 días',
}

/**
 * Qué significa cada tramo para la inmobiliaria. No es decoración: a los 90
 * días el problema deja de ser de cobranza y pasa a ser jurídico.
 */
export const QUE_SIGNIFICA: Record<Edad, string> = {
  por_vencer: 'Todavía no se vence. No es mora.',
  '1-30': 'Mora temprana: casi siempre se resuelve con un recordatorio.',
  '31-60': 'Ya no es un olvido. Acá entra la gestión de cobranza.',
  '61-90': 'Riesgo de perder el mes. Conviene un acuerdo de pago.',
  '90+': 'Deja de ser cobranza. Es jurídico y reclamación a la aseguradora.',
}

export function edadDe(item: CarteraItem): Edad {
  if (item.daysLate <= 0) return 'por_vencer'
  if (item.daysLate <= 30) return '1-30'
  if (item.daysLate <= 60) return '31-60'
  if (item.daysLate <= 90) return '61-90'
  return '90+'
}

export interface TramoDeCartera {
  edad: Edad
  items: CarteraItem[]
  monto: number
}

export interface CarteraDiscriminada {
  tramos: TramoDeCartera[]
  /** Lo que aún no vence. NO es mora. */
  porVencer: number
  /** La mora de verdad: todo lo vencido. */
  enMora: number
  /** Cuántas deudas vencidas hay, no cuánta plata. */
  deudasEnMora: number
  total: number
}

export function discriminar(items: CarteraItem[]): CarteraDiscriminada {
  const porEdad = new Map<Edad, CarteraItem[]>(EDADES.map((e) => [e, []]))
  for (const item of items) {
    porEdad.get(edadDe(item))!.push(item)
  }

  const tramos = EDADES.map((edad) => {
    const suyos = porEdad.get(edad)!
    return {
      edad,
      items: suyos,
      monto: suyos.reduce((s, i) => s + i.pendingAmount, 0),
    }
  })

  const porVencer = tramos.find((t) => t.edad === 'por_vencer')!.monto
  const vencidos = tramos.filter((t) => t.edad !== 'por_vencer')

  return {
    tramos,
    porVencer,
    enMora: vencidos.reduce((s, t) => s + t.monto, 0),
    deudasEnMora: vencidos.reduce((s, t) => s + t.items.length, 0),
    total: porVencer + vencidos.reduce((s, t) => s + t.monto, 0),
  }
}

/**
 * La cartera agrupada por propietario.
 *
 * Es la pregunta que la inmobiliaria hace de verdad: no «cuánto se debe», sino
 * «a quién le estoy quedando mal». Un propietario con cuatro inmuebles en mora
 * se va, y eso no se ve en una lista ordenada por monto.
 */
export interface DeudaDePropietario {
  propietarioId: string | null
  propietarioName: string
  monto: number
  deudas: number
  /** Cuántos inmuebles DISTINTOS tienen deuda: cuatro cobros de un mismo apto son un inmueble. */
  inmuebles: number
  peorEdad: Edad
}

export const SIN_PROPIETARIO = 'Sin propietario registrado'

export function porPropietario(items: CarteraItem[]): DeudaDePropietario[] {
  const mapa = new Map<string, DeudaDePropietario & { consignaciones: Set<string> }>()
  for (const item of items) {
    /*
     * Sin propietario la deuda no desaparece: se agrupa bajo una clave propia
     * y se nombra. Esconderla haría que los totales por propietario no sumen
     * el total de la cartera, y nadie sabría por qué.
     */
    const clave = item.propietarioId ?? '__sin_propietario__'
    const actual = mapa.get(clave) ?? {
      propietarioId: item.propietarioId,
      propietarioName: item.propietarioName ?? SIN_PROPIETARIO,
      monto: 0,
      deudas: 0,
      inmuebles: 0,
      peorEdad: 'por_vencer' as Edad,
      consignaciones: new Set<string>(),
    }
    actual.monto += item.pendingAmount
    actual.deudas += 1
    actual.consignaciones.add(item.consignacionId)
    actual.inmuebles = actual.consignaciones.size
    if (EDADES.indexOf(edadDe(item)) > EDADES.indexOf(actual.peorEdad)) {
      actual.peorEdad = edadDe(item)
    }
    mapa.set(clave, actual)
  }
  return [...mapa.values()]
    .map(({ consignaciones: _c, ...p }) => p)
    .sort((a, b) => b.monto - a.monto)
}

// ── Filtros ────────────────────────────────────────────────────────────────
//
// La pantalla tiene tres filtros que se combinan: el tramo (una ficha de
// arriba), la búsqueda (la caja de la tabla) y el propietario (al tocar una
// fila de «Por propietario»). Viven acá, puros, para que la pantalla no
// tenga que saber cómo se compara un nombre con una búsqueda.

export interface FiltroDeCartera {
  /** Un tramo, o nada. */
  edad?: Edad | null
  /** Texto libre contra inquilino, inmueble y propietario. */
  busqueda?: string
  /**
   * `undefined` = sin filtro. `null` = SÓLO las deudas sin propietario (la
   * fila «Sin propietario registrado» también se puede abrir).
   */
  propietarioId?: string | null
}

/** ¿Alguno de los textos contiene la búsqueda? Sin búsqueda, todo coincide. */
export function coincide(textos: ReadonlyArray<string | null | undefined>, busqueda: string): boolean {
  const q = busqueda.trim().toLowerCase()
  if (!q) return true
  return textos.some((t) => Boolean(t) && t!.toLowerCase().includes(q))
}

export function hayFiltrosDeCartera(f: FiltroDeCartera): boolean {
  return Boolean(f.edad) || (f.busqueda?.trim().length ?? 0) > 0 || f.propietarioId !== undefined
}

/** Sirve para las deudas y para los siniestros: comparten la forma. */
export function filtrarCartera<T extends CarteraItem>(items: readonly T[], f: FiltroDeCartera): T[] {
  return items.filter((i) => {
    if (f.edad && edadDe(i) !== f.edad) return false
    if (f.propietarioId !== undefined && i.propietarioId !== f.propietarioId) return false
    return coincide([i.tenantName, i.propertyTitle, i.propertyAddress, i.propietarioName], f.busqueda ?? '')
  })
}

export function filtrarPropietarios(
  propietarios: readonly DeudaDePropietario[],
  busqueda: string,
): DeudaDePropietario[] {
  return propietarios.filter((p) => coincide([p.propietarioName], busqueda))
}
