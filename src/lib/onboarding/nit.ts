/**
 * nit.ts — el NIT colombiano, con su dígito de verificación de verdad.
 *
 * Un NIT (Número de Identificación Tributaria, DIAN) es un número base más un
 * dígito de verificación que se calcula a partir de él y se escribe después de
 * un guion: `900123456-8`. En los RUT impresos el base viene con puntos
 * (`900.123.456-8`), así que acá se limpian antes de revisar nada.
 *
 * Longitud del base:
 *  - Persona jurídica (el caso normal de una inmobiliaria): 9 dígitos.
 *  - Persona natural inscrita en el RUT: su cédula, que puede tener entre 6 y
 *    10 dígitos. Una inmobiliaria puede estar a nombre de una persona natural,
 *    así que NO se exige 9 — se aceptan 6 a 10 y se explica la norma cuando
 *    queda fuera de ese rango.
 *
 * El dígito de verificación se calcula multiplicando cada dígito del base
 * —de derecha a izquierda— por un peso primo fijo, sumando, y tomando el
 * residuo entre 11: si el residuo es 0 o 1 el dígito ES el residuo, y si no,
 * es 11 menos el residuo. Los pesos y la regla están fijados por la DIAN.
 *
 * Comprobado contra NITs públicos reales antes de usarlo:
 *   890903938-8 (Bancolombia) · 899999068-1 (Ecopetrol) · 860002964-4 (Bogotá)
 */

/** Pesos de la DIAN, aplicados de derecha a izquierda sobre el base. */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const

/** Un base más corto que esto no es un documento de identidad colombiano. */
export const BASE_MINIMO = 6
/** Ni la cédula más larga ni un NIT de persona jurídica pasan de acá. */
export const BASE_MAXIMO = 10
/** Lo que trae un NIT de persona jurídica, que es el caso normal acá. */
export const BASE_PERSONA_JURIDICA = 9

export type MotivoNit =
  | 'vacio'
  | 'caracteres'
  | 'formato'
  | 'corto'
  | 'largo'
  | 'arranca-en-cero'
  | 'digito-de-verificacion'

export interface NitBueno {
  ok: true
  /** Sólo dígitos, sin puntos ni guion. */
  base: string
  /** Calculado, no el que escribió la persona. */
  dv: number
  /** `900123456-8` — lo que se manda al back. */
  normalizado: string
  /** `900.123.456-8` — lo que se le muestra a la persona. */
  bonito: string
  /** true si escribió el dígito de verificación y coincide. */
  traiaDv: boolean
}

export interface NitMalo {
  ok: false
  motivo: MotivoNit
  mensaje: string
}

export type RevisionDeNit = NitBueno | NitMalo

/**
 * Dígito de verificación de un base de sólo dígitos. Lanza si le llega
 * cualquier otra cosa: es un cálculo, no un validador.
 */
export function digitoDeVerificacion(base: string): number {
  if (!/^\d+$/.test(base)) {
    throw new Error(`digitoDeVerificacion espera sólo dígitos, recibió "${base}"`)
  }
  if (base.length > PESOS.length) {
    throw new Error(`El NIT no puede tener más de ${PESOS.length} dígitos`)
  }
  let suma = 0
  for (let i = 0; i < base.length; i += 1) {
    // De derecha a izquierda: el último dígito lleva el primer peso.
    const digito = Number(base[base.length - 1 - i])
    suma += digito * PESOS[i]
  }
  const residuo = suma % 11
  return residuo < 2 ? residuo : 11 - residuo
}

/** `900123456` → `900.123.456`. Los puntos son de a tres, desde la derecha. */
function conPuntos(base: string): string {
  return base.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Quita todo lo que en un RUT impreso es adorno: puntos, espacios, guiones
 * bajos y los guiones largos que copian y pegan desde Word.
 */
function limpiar(crudo: string): string {
  return crudo.replace(/[.\s_]/g, '').replace(/[‐-―−]/g, '-')
}

/**
 * Revisa lo que escribió la persona y devuelve o el NIT normalizado o el
 * motivo exacto por el que no sirve. Nunca lanza.
 */
export function revisarNit(crudo: string): RevisionDeNit {
  const limpio = limpiar(crudo ?? '').trim()

  if (!limpio) {
    return { ok: false, motivo: 'vacio', mensaje: 'El NIT es obligatorio.' }
  }

  if (/[a-zA-Z]/.test(limpio)) {
    return {
      ok: false,
      motivo: 'caracteres',
      mensaje: 'El NIT lleva sólo números y, al final, el dígito de verificación.',
    }
  }

  // Un guion, en el penúltimo lugar, y nada más. Todo lo demás es formato malo.
  if (!/^\d+(-\d)?$/.test(limpio)) {
    return {
      ok: false,
      motivo: 'formato',
      mensaje: 'Escribe el NIT así: 900123456-8 (el guion separa el dígito de verificación).',
    }
  }

  const [base, dvEscrito] = limpio.split('-')

  if (base.startsWith('0')) {
    return {
      ok: false,
      motivo: 'arranca-en-cero',
      mensaje: 'Ningún NIT empieza por cero. Revisa el número.',
    }
  }

  if (base.length < BASE_MINIMO) {
    return {
      ok: false,
      motivo: 'corto',
      mensaje: `Le faltan dígitos: el NIT de una empresa tiene ${BASE_PERSONA_JURIDICA} antes del guion.`,
    }
  }

  if (base.length > BASE_MAXIMO) {
    return {
      ok: false,
      motivo: 'largo',
      mensaje: `Le sobran dígitos: el NIT de una empresa tiene ${BASE_PERSONA_JURIDICA} antes del guion.`,
    }
  }

  const dv = digitoDeVerificacion(base)

  if (dvEscrito !== undefined && Number(dvEscrito) !== dv) {
    return {
      ok: false,
      motivo: 'digito-de-verificacion',
      // Decirle cuál ES ahorra el viaje al RUT: el dígito se deduce del resto.
      mensaje: `El dígito de verificación no corresponde. Para ${conPuntos(base)} es ${dv}.`,
    }
  }

  return {
    ok: true,
    base,
    dv,
    normalizado: `${base}-${dv}`,
    bonito: `${conPuntos(base)}-${dv}`,
    traiaDv: dvEscrito !== undefined,
  }
}
