/**
 * Discriminar la cartera: primero por CAJÓN, y sólo dentro de la cartera por
 * EDAD.
 *
 * ── Lo que cambió el 2026-09-16, y por qué importa ──────────────────────────
 *
 * Antes este archivo hacía dos cuentas que el back no sabía hacer: separaba lo
 * que aún no vencía (`daysLate <= 0`) de la mora, porque el back agrupaba todo
 * con `daysLate <= 30`. Hoy el back sale de `contrato_cuotas` y trae la
 * frontera ya resuelta, con los días de plazo del contrato adentro
 * (`cuota-es-cartera.ts`). Así que acá ya no se define nada: se AGRUPA lo que
 * el back clasificó.
 *
 * La diferencia no es cosmética. «Venció» dejó de significar «hay que ir a
 * buscarlo»:
 *
 *   · `POR_VENCER` ...... todavía no vence. Es deuda del contrato, no cartera.
 *   · `VENCIDA_EN_PLAZO`  venció, pero los días de plazo que la inmobiliaria
 *                         misma pactó siguen corriendo. Sigue siendo deuda: no
 *                         le corre interés y la cobranza no la toca.
 *   · `CARTERA` ......... pasó el vencimiento MÁS el plazo. Ahí —y sólo ahí—
 *                         entra la cobranza.
 *
 * Los tres son una PARTICIÓN: cada cuota cae en uno, así que suman la deuda
 * total sin que nadie tenga que mantener el invariante. Es el mismo
 * vocabulario de «Cartera por concepto» (`@/lib/api/cartera.types`).
 *
 * Y la EDAD se mide sobre `diasDeMora`, que son los días DESPUÉS del plazo.
 * Una deuda que ayer decía «30 días» hoy puede decir 27: es la primera vez que
 * el tramo respeta el plazo del contrato.
 */

import type { CajonDeLaCuota } from '@/lib/api/cartera.types'
import type { CarteraItem } from '@/lib/types/inmobiliaria'

/** Los tres cajones que una deuda puede ocupar. `SIN_DEUDA` no llega al informe. */
export type Cajon = Exclude<CajonDeLaCuota, 'SIN_DEUDA'>

export const CAJONES: Cajon[] = ['POR_VENCER', 'VENCIDA_EN_PLAZO', 'CARTERA']

/** Las MISMAS palabras que la franja de «Cartera por concepto». */
export const NOMBRE_DEL_CAJON: Record<Cajon, string> = {
  POR_VENCER: 'Por vencer',
  VENCIDA_EN_PLAZO: 'Vencido, en plazo',
  CARTERA: 'Cartera',
}

export const QUE_SIGNIFICA_EL_CAJON: Record<Cajon, string> = {
  POR_VENCER: 'Todavía no vence. Es deuda, no cartera.',
  VENCIDA_EN_PLAZO: 'Venció, pero el plazo del contrato sigue corriendo.',
  CARTERA: 'Pasó el plazo. Es lo único que la cobranza persigue.',
}

/** Los tramos por edad. Sólo se le aplican a lo que YA es cartera. */
export type Edad = '0-30' | '31-60' | '61-90' | '90+'

export const EDADES: Edad[] = ['0-30', '31-60', '61-90', '90+']

export const NOMBRE_DE_EDAD: Record<Edad, string> = {
  '0-30': '0 a 30 días',
  '31-60': '31 a 60 días',
  '61-90': '61 a 90 días',
  '90+': 'Más de 90 días',
}

/**
 * Qué significa cada tramo. No es decoración: a los 90 días el problema deja
 * de ser de cobranza y pasa a ser jurídico.
 */
export const QUE_SIGNIFICA: Record<Edad, string> = {
  '0-30': 'Mora temprana: casi siempre se resuelve con un recordatorio.',
  '31-60': 'Ya no es un olvido. Acá entra la gestión de cobranza.',
  '61-90': 'Riesgo de perder el mes. Conviene un acuerdo de pago.',
  '90+': 'Deja de ser cobranza. Es jurídico y reclamación a la aseguradora.',
}

/**
 * En qué tramo cae. `null` mientras no sea cartera: una deuda que todavía no
 * pasó el plazo NO tiene edad de mora, y ponerle «0-30» la metería en la lista
 * de a quién llamar.
 */
export function edadDe(item: CarteraItem): Edad | null {
  if (item.cajon !== 'CARTERA') return null
  if (item.diasDeMora <= 30) return '0-30'
  if (item.diasDeMora <= 60) return '31-60'
  if (item.diasDeMora <= 90) return '61-90'
  return '90+'
}

/**
 * Lo peor que le puede pasar a una deuda, de menos a más grave.
 *
 * Es una escala sola —cajón y edad en la misma recta— porque la columna «Lo
 * peor» de la tabla por propietario tiene que poder comparar una deuda futura
 * con una de 95 días sin que la pantalla sepa cuál de las dos dimensiones
 * mirar.
 */
export const GRAVEDAD = [
  'POR_VENCER',
  'VENCIDA_EN_PLAZO',
  '0-30',
  '31-60',
  '61-90',
  '90+',
] as const
export type Gravedad = (typeof GRAVEDAD)[number]

export const NOMBRE_DE_GRAVEDAD: Record<Gravedad, string> = {
  POR_VENCER: NOMBRE_DEL_CAJON.POR_VENCER,
  VENCIDA_EN_PLAZO: NOMBRE_DEL_CAJON.VENCIDA_EN_PLAZO,
  '0-30': NOMBRE_DE_EDAD['0-30'],
  '31-60': NOMBRE_DE_EDAD['31-60'],
  '61-90': NOMBRE_DE_EDAD['61-90'],
  '90+': NOMBRE_DE_EDAD['90+'],
}

export function gravedadDe(item: CarteraItem): Gravedad {
  return edadDe(item) ?? (item.cajon as Exclude<Cajon, 'CARTERA'>)
}

export interface TramoDeCartera {
  edad: Edad
  items: CarteraItem[]
  monto: number
}

export interface MontoDelCajon {
  cajon: Cajon
  items: CarteraItem[]
  monto: number
}

export interface CarteraDiscriminada {
  /** Los tres cajones, siempre los tres, aunque alguno vaya en cero. */
  cajones: MontoDelCajon[]
  /** Los cuatro tramos de la CARTERA, siempre los cuatro. */
  tramos: TramoDeCartera[]
  /** Toda la deuda: la suma de los tres cajones. */
  deudaTotal: number
}

/**
 * Agrupa las filas por cajón y por edad.
 *
 * 🔴 Los montos salen de las MISMAS filas que la lista, no del `summary`: así
 * la cifra de una ficha y las filas que se ven al tocarla no pueden discrepar.
 * El `summary` del back cuenta exactamente estas filas (los siniestros van en
 * su propia sección, fuera de `items`), así que cuadran.
 */
export function discriminar(items: readonly CarteraItem[]): CarteraDiscriminada {
  const porCajon = new Map<Cajon, CarteraItem[]>(CAJONES.map((c) => [c, []]))
  const porEdad = new Map<Edad, CarteraItem[]>(EDADES.map((e) => [e, []]))

  for (const item of items) {
    porCajon.get(item.cajon as Cajon)?.push(item)
    const edad = edadDe(item)
    if (edad) porEdad.get(edad)!.push(item)
  }

  const sumar = (suyos: readonly CarteraItem[]) =>
    suyos.reduce((s, i) => s + i.pendingAmount, 0)

  const cajones = CAJONES.map((cajon) => {
    const suyos = porCajon.get(cajon)!
    return { cajon, items: suyos, monto: sumar(suyos) }
  })

  return {
    cajones,
    tramos: EDADES.map((edad) => {
      const suyos = porEdad.get(edad)!
      return { edad, items: suyos, monto: sumar(suyos) }
    }),
    deudaTotal: cajones.reduce((s, c) => s + c.monto, 0),
  }
}

/**
 * La cartera agrupada por propietario.
 *
 * Es la pregunta que la inmobiliaria hace de verdad: no «cuánto se debe», sino
 * «a quién le estoy quedando mal». Un propietario con cuatro inmuebles en
 * cartera se va, y eso no se ve en una lista ordenada por monto.
 */
export interface DeudaDePropietario {
  propietarioId: string | null
  propietarioName: string
  monto: number
  deudas: number
  /** Cuántos inmuebles DISTINTOS deben: cuatro cuotas de un mismo apto son uno. */
  inmuebles: number
  /** Lo peor que tiene encima, en la escala única cajón + edad. */
  peor: Gravedad
}

export const SIN_PROPIETARIO = 'Sin propietario registrado'

export function porPropietario(items: readonly CarteraItem[]): DeudaDePropietario[] {
  const mapa = new Map<string, DeudaDePropietario & { inmueblesVistos: Set<string> }>()
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
      peor: 'POR_VENCER' as Gravedad,
      inmueblesVistos: new Set<string>(),
    }
    actual.monto += item.pendingAmount
    actual.deudas += 1
    /*
     * El inmueble se cuenta por `propertyId`; un contrato migrado sin inmueble
     * cuenta como uno propio en vez de fundirse con los demás huérfanos.
     */
    actual.inmueblesVistos.add(item.propertyId ?? `contrato:${item.contractId}`)
    actual.inmuebles = actual.inmueblesVistos.size
    const gravedad = gravedadDe(item)
    if (GRAVEDAD.indexOf(gravedad) > GRAVEDAD.indexOf(actual.peor)) {
      actual.peor = gravedad
    }
    mapa.set(clave, actual)
  }
  return [...mapa.values()]
    .map(({ inmueblesVistos: _i, ...p }) => p)
    .sort((a, b) => b.monto - a.monto)
}

// ── Filtros ────────────────────────────────────────────────────────────────
//
// La pantalla combina cuatro: el cajón (una cifra de la franja), el tramo (una
// ficha de edad), la búsqueda y el propietario. Viven acá, puros, para que la
// pantalla no tenga que saber cómo se compara un nombre con una búsqueda.

export interface FiltroDeCartera {
  /** Un cajón, o nada. Elegir un tramo ya implica `CARTERA`. */
  cajon?: Cajon | null
  /** Un tramo de edad, o nada. */
  edad?: Edad | null
  /** Texto libre contra inquilino, inmueble, propietario y contrato. */
  busqueda?: string
  /**
   * `undefined` = sin filtro. `null` = SÓLO las deudas sin propietario (la
   * fila «Sin propietario registrado» también se puede abrir).
   */
  propietarioId?: string | null
}

/** ¿Alguno de los textos contiene la búsqueda? Sin búsqueda, todo coincide. */
export function coincide(
  textos: ReadonlyArray<string | null | undefined>,
  busqueda: string,
): boolean {
  const q = busqueda.trim().toLowerCase()
  if (!q) return true
  return textos.some((t) => Boolean(t) && t!.toLowerCase().includes(q))
}

export function hayFiltrosDeCartera(f: FiltroDeCartera): boolean {
  return (
    Boolean(f.cajon) ||
    Boolean(f.edad) ||
    (f.busqueda?.trim().length ?? 0) > 0 ||
    f.propietarioId !== undefined
  )
}

/** Sirve para las deudas y para los siniestros: comparten la forma. */
export function filtrarCartera<T extends CarteraItem>(
  items: readonly T[],
  f: FiltroDeCartera,
): T[] {
  return items.filter((i) => {
    if (f.cajon && i.cajon !== f.cajon) return false
    if (f.edad && edadDe(i) !== f.edad) return false
    if (f.propietarioId !== undefined && i.propietarioId !== f.propietarioId) return false
    return coincide(
      [i.tenantName, i.propertyTitle, i.propertyAddress, i.propietarioName, i.contrato],
      f.busqueda ?? '',
    )
  })
}

export function filtrarPropietarios(
  propietarios: readonly DeudaDePropietario[],
  busqueda: string,
): DeudaDePropietario[] {
  return propietarios.filter((p) => coincide([p.propietarioName], busqueda))
}
