/**
 * Cuando al propietario NO le queda plata: «queda debiendo».
 *
 * 🔴 DECISIÓN DE NEGOCIO (Nico, 2026-09-15) — CAMBIABLE, y por eso vive en un
 * archivo propio: la regla es una sola y la usan todas las pantallas que
 * muestran lo que le queda a un propietario.
 *
 * El neto de un propietario da NEGATIVO cuando la inmobiliaria le descontó más
 * de lo que recaudó: una reparación grande, la comisión de un mes sin recaudo,
 * un ajuste. Eso NO es plata a su favor. Hasta la auditoría del 13-09 la
 * liquidación pintaba ese número en verde («$0 verde» sobre un negativo, caso
 * L1), que es exactamente al revés de lo que pasó.
 *
 * Las dos reglas:
 *
 *   1. Un neto negativo se pinta en ROJO y se dice con la palabra: «queda
 *      debiendo $X». Nunca en verde, nunca con un signo menos a secas —un
 *      «−$1.200.000» entre columnas alineadas se lee como un número más.
 *   2. Ninguna suma cuenta un negativo como ingreso. `sumarLoQueSeGira` separa
 *      lo que efectivamente se gira de lo que queda debiendo: sumarlos juntos
 *      da un total que no es ni una cosa ni la otra.
 */

/** `$1.234.567`. Sin decimales: el peso colombiano no los usa en pantalla. */
export function pesos(valorCop: number): string {
  return `$${Math.round(valorCop).toLocaleString('es-CO')}`
}

export interface NetoDelPropietario {
  /** El valor con su signo, tal cual vino del back. */
  valorCop: number
  /** `true` = le descontamos más de lo que recaudó. */
  quedaDebiendo: boolean
  /** Lo que se escribe: `$1.234.567` o `queda debiendo $1.234.567`. */
  texto: string
  /** La clase del color. Rojo cuando queda debiendo; NUNCA verde. */
  clase: string
  /** Por qué, para el `title` y para quien lee con lector de pantalla. */
  explicacion: string | null
}

/**
 * Cómo se muestra el neto de un propietario.
 *
 * `formatear` se puede reemplazar por el formateador de la pantalla (el del
 * i18n, por ejemplo) sin que la regla cambie.
 */
export function netoDelPropietario(
  valorCop: number,
  formatear: (v: number) => string = pesos,
): NetoDelPropietario {
  if (valorCop < 0) {
    return {
      valorCop,
      quedaDebiendo: true,
      texto: `queda debiendo ${formatear(Math.abs(valorCop))}`,
      clase: 'text-danger',
      explicacion:
        'Se le descontó más de lo que se recaudó en el período, así que no hay plata a su favor: esta diferencia queda debiendo y se cruza con el próximo giro.',
    }
  }
  return {
    valorCop,
    quedaDebiendo: false,
    texto: formatear(valorCop),
    // Neutro a propósito: que algo sea positivo no lo vuelve una buena noticia
    // que haya que pintar de verde.
    clase: 'text-fg',
    explicacion: null,
  }
}

/**
 * Suma que NUNCA cuenta un negativo como ingreso.
 *
 * Devuelve las dos cifras por separado porque son dos hechos distintos: lo que
 * se gira y lo que queda debiendo. Un solo total los mezcla y deja de decir
 * cuánto se giró de verdad.
 */
export function sumarLoQueSeGira(valores: readonly number[]): {
  /** Lo que efectivamente se le gira a los propietarios. */
  seGiraCop: number
  /** Lo que quedan debiendo, siempre positivo. */
  quedanDebiendoCop: number
  /** A cuántos propietarios (o filas) les quedó saldo en contra. */
  cuantosDeben: number
} {
  let seGiraCop = 0
  let quedanDebiendoCop = 0
  let cuantosDeben = 0
  for (const v of valores) {
    if (v < 0) {
      quedanDebiendoCop += Math.abs(v)
      cuantosDeben += 1
    } else {
      seGiraCop += v
    }
  }
  return { seGiraCop, quedanDebiendoCop, cuantosDeben }
}
