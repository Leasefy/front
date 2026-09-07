/**
 * nit.ts — el NIT colombiano, con su dígito de verificación de verdad.
 *
 * Un NIT (Número de Identificación Tributaria, DIAN) es un número base más un
 * dígito de verificación que se calcula a partir de él y se escribe después de
 * un guion: `900123456-8`. En los RUT impresos el base viene con puntos
 * (`900.123.456-8`), así que acá se limpian antes de revisar nada.
 *
 * Longitud del base:
 *  - Persona jurídica (el caso normal de una inmobiliaria): 9 dígitos, los
 *    que asigna la DIAN (800…, 890…, 900…, 901…).
 *  - Persona natural inscrita en el RUT: su cédula. Las cédulas nuevas (desde
 *    2003) tienen 10 dígitos; las viejas, entre 6 y 8.
 *  El asistente del agente (`agent-integracion`, `NIT_REGEX`) sólo acepta 9 o
 *  10 dígitos antes del guion, y el back crea la agencia ANTES de llamarlo:
 *  un NIT que pase acá y no allá deja «Tu inmobiliaria quedó creada, pero no
 *  alcanzamos a abrir el asistente» sin salida (Nico lo vio el 2026-09-07 con
 *  8 dígitos). Por eso acá se exige lo mismo: 9 o 10. Con la DV son 10 u 11
 *  caracteres numéricos («un NIT va de 9 a 11 dígitos», Nico).
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

/** Lo mínimo que acepta el asistente del agente: el NIT de una empresa. */
export const BASE_MINIMO = 9
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
      mensaje: `Le faltan dígitos: un NIT tiene ${BASE_PERSONA_JURIDICA} antes del guion (${BASE_MAXIMO} si es una cédula nueva).`,
    }
  }

  if (base.length > BASE_MAXIMO) {
    return {
      ok: false,
      motivo: 'largo',
      mensaje: `Le sobran dígitos: un NIT tiene ${BASE_PERSONA_JURIDICA} antes del guion (${BASE_MAXIMO} como máximo, si es una cédula nueva).`,
    }
  }

  const dv = digitoDeVerificacion(base)

  if (dvEscrito !== undefined && Number(dvEscrito) !== dv) {
    // Con 9 dígitos y guion puede ser también una cédula de 10 a la que el
    // campo le puso el guion antes de tiempo (ver `formatearNitAlEscribir`):
    // decírselo evita que crea que su NIT está mal.
    const pista =
      base.length === BASE_PERSONA_JURIDICA
        ? ` Si tu NIT tiene ${BASE_MAXIMO} dígitos, sigue escribiendo: el guion se acomoda solo.`
        : ''
    return {
      ok: false,
      motivo: 'digito-de-verificacion',
      // Decirle cuál ES ahorra el viaje al RUT: el dígito se deduce del resto.
      mensaje: `El dígito de verificación no corresponde. Para ${conPuntos(base)} es ${dv}.${pista}`,
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

/** Lo más largo que puede quedar en el campo: 10 dígitos, el guion y la DV. */
export const LARGO_MAXIMO_AL_ESCRIBIR = BASE_MAXIMO + 2

/**
 * Formatea el NIT MIENTRAS se escribe: sólo dígitos, y el guion lo pone el
 * campo, no la persona (Nico, 2026-09-07: «cuando llegues al número máximo
 * coloca el guion dentro del input»). Como el base puede tener 9 o 10
 * dígitos, el guion va siempre antes del ÚLTIMO dígito en cuanto hay diez o
 * más: `9001234568` → `900123456-8`, `10203040509` → `1020304050-9`. Con
 * nueve o menos no hay guion: todavía es el número. Nunca más de 10 + 1: lo
 * que sobre se descarta al teclear, no después con un error (antes se podían
 * escribir 21 ceros y recién al enviar se quejaba).
 */
export function formatearNitAlEscribir(crudo: string): string {
  const digitos = crudo.replace(/\D/g, '').slice(0, BASE_MAXIMO + 1)
  if (digitos.length <= BASE_PERSONA_JURIDICA) return digitos
  return `${digitos.slice(0, -1)}-${digitos.slice(-1)}`
}
