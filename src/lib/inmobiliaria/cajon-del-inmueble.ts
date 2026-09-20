/**
 * En qué cajón cae cada inmueble del portafolio. UNA función, para la ficha
 * y para el filtro.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El 19-09, abriendo «Inmuebles» por primera vez en un navegador, la franja de
 * arriba decía **133 Total** y las cuatro fichas de al lado sumaban **109**.
 * Tres defectos distintos, encimados:
 *
 * 1. **25 inmuebles sin cajón.** `total` cuenta el portafolio entero —ése fue
 *    un arreglo a propósito: una propiedad importada sin mandato tiene que
 *    aparecer en el conteo—, pero las cuatro fichas sólo contaban mandatos.
 *    Esas 25 filas no tenían ficha NI pestaña: existían en la tabla y en
 *    ningún número. Es la quinta vez en el día que aparece la misma forma de
 *    error: **una categoría que existe en los datos y no tiene pestaña**.
 *
 * 2. **Una fila contada dos veces.** «Arrendadas» usaba el CONTRATO
 *    (`arrendado`) y «Mantenimiento» usaba la disponibilidad del mandato, sin
 *    descontar la anterior. El único inmueble marcado MAINTENANCE también
 *    tiene contrato vigente, así que sumaba en las dos: por eso 3 + 105 + 0 +
 *    1 = 109 sobre 108 mandatos.
 *
 * 3. **La cifra y el filtro no contaban lo mismo.** La ficha decía
 *    «Arrendadas 105» y el chip «Arrendado» mostraba 104, porque la ficha
 *    preguntaba por el contrato y el filtro por `availability`. El arreglo del
 *    12-09 —«no me está relacionando bien los inmuebles arrendados porque
 *    tengo 741 contratos activos pero me dice que sólo tengo 674»— se aplicó a
 *    la ficha y nunca al filtro.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * Los cajones se prueban EN ORDEN y el primero que calza se lleva la fila, así
 * que son disjuntos por construcción; y el último es un complemento, así que
 * son exhaustivos. Sumar los cinco da el total, siempre — no por disciplina de
 * quien los lea después, sino porque no hay forma de que no dé.
 *
 *   1. `sinMandato`    — la fila no es una consignación: es un inmueble
 *                        cargado que todavía nadie puso a administrar.
 *   2. `arrendado`     — tiene CONTRATO vigente. Manda sobre lo que diga la
 *                        disponibilidad del mandato, que en lo migrado quedó
 *                        vieja: un mandato puede seguir diciendo «disponible»
 *                        o «en mantenimiento» sobre un inmueble ocupado.
 *   3. `enProceso`     — sin contrato y con el mandato en proceso.
 *   4. `mantenimiento` — sin contrato y con el mandato en mantenimiento.
 *   5. `disponible`    — todo lo demás. Es el COMPLEMENTO, no un valor: así,
 *                        un `availability` que el back agregue mañana cae en
 *                        un cajón visible en vez de desaparecer de la suma.
 */

import type { Consignacion, PortafolioRow } from '@/lib/types/inmobiliaria'

export type CajonDelInmueble =
  | 'disponible'
  | 'arrendado'
  | 'enProceso'
  | 'mantenimiento'
  | 'sinMandato'

/** En el orden en que se leen en pantalla. */
export const CAJONES_DEL_INMUEBLE: readonly CajonDelInmueble[] = [
  'disponible',
  'arrendado',
  'enProceso',
  'mantenimiento',
  'sinMandato',
] as const

/**
 * ¿Tiene contrato vigente?
 *
 * `arrendado` lo dice el contrato. Si la fila viene de una respuesta vieja que
 * todavía no trae el campo, se cae a la disponibilidad del mandato en vez de
 * contar 0: peor un dato viejo que un dato inventado.
 */
export function estaArrendado(c: Consignacion): boolean {
  return c.arrendado ?? normalizar(c.availability) === 'rented'
}

function normalizar(valor: string | null | undefined): string {
  return (valor ?? '').toLowerCase()
}

export function cajonDelInmueble(fila: PortafolioRow): CajonDelInmueble {
  if (fila.kind !== 'consignacion') return 'sinMandato'
  if (estaArrendado(fila)) return 'arrendado'
  const disponibilidad = normalizar(fila.availability)
  if (disponibilidad === 'in_process') return 'enProceso'
  if (disponibilidad === 'maintenance') return 'mantenimiento'
  return 'disponible'
}

/** Cuántos hay en cada cajón. Los cinco suman `filas.length`. */
export function contarPorCajon(
  filas: readonly PortafolioRow[],
): Record<CajonDelInmueble, number> {
  const cuenta: Record<CajonDelInmueble, number> = {
    disponible: 0,
    arrendado: 0,
    enProceso: 0,
    mantenimiento: 0,
    sinMandato: 0,
  }
  for (const fila of filas) cuenta[cajonDelInmueble(fila)] += 1
  return cuenta
}
