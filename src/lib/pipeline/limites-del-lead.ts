/**
 * Los topes del lead, con las MISMAS cifras y frases que el back (02-10-2026).
 *
 * 🔴 El presupuesto del prospecto (`presupuestoCop`) iba a una columna `int4`
 * con sólo «mayor que cero»: una cifra con ceros de más daba un 500 (P2020).
 * Nico (pregunta 1): «sólo el tope de la columna», sin regla de negocio.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/leads/limites-del-lead.ts`. Si cambia
 * uno, cambia el otro.
 *
 * Hoy ninguna pantalla manda `presupuestoCop` (`NuevoLeadDialog` no tiene ese
 * campo): `revisarPresupuestoDelLead` queda lista para el formulario que lo
 * pida, y `erroresDelLead` ya sabe dónde va el error del servidor.
 */

/** El tope de la columna `int4`, en una cifra que se lee (decisión de Nico). */
export const PRESUPUESTO_MAXIMO_DEL_LEAD_COP = 2_000_000_000

/** Cuántos orígenes puede tener la lista de la inmobiliaria. */
export const MAX_ORIGENES_DE_LEAD = 50

/** B-01: el plazo para responder un lead, en horas. */
export const PLAZO_PARA_RESPONDER_MINIMO_HORAS = 1
export const PLAZO_PARA_RESPONDER_MAXIMO_HORAS = 720

export const MENSAJES_DEL_LEAD = {
  presupuestoEntero: 'El presupuesto debe ser un número entero de pesos, sin decimales.',
  presupuestoMinimo: 'El presupuesto debe ser mayor que cero.',
  presupuestoMaximo: 'El presupuesto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  origenesMaximos: 'Puedes tener hasta 50 orígenes de lead.',
  plazoParaResponder: 'El plazo para responder va de 1 a 720 horas.',
  plazoParaResponderEntero: 'El plazo para responder debe ser un número entero de horas.',
} as const

/**
 * El presupuesto que dijo el interesado, revisado como lo revisa el back.
 * Vacío (`null`/`undefined`) está bien: el campo es opcional.
 */
export function revisarPresupuestoDelLead(valor: number | null | undefined): string | undefined {
  if (valor === null || valor === undefined) return undefined
  if (!Number.isInteger(valor)) return MENSAJES_DEL_LEAD.presupuestoEntero
  if (valor < 1) return MENSAJES_DEL_LEAD.presupuestoMinimo
  if (valor > PRESUPUESTO_MAXIMO_DEL_LEAD_COP) return MENSAJES_DEL_LEAD.presupuestoMaximo
  return undefined
}

/**
 * El plazo para responder (lo que escribió la persona, como texto). Vacío no
 * opina: el botón no se prende.
 */
export function revisarPlazoParaResponder(texto: string): string | undefined {
  const t = texto.trim()
  if (t === '') return undefined
  const n = Number(t)
  if (!Number.isInteger(n)) return MENSAJES_DEL_LEAD.plazoParaResponderEntero
  if (n < PLAZO_PARA_RESPONDER_MINIMO_HORAS || n > PLAZO_PARA_RESPONDER_MAXIMO_HORAS) {
    return MENSAJES_DEL_LEAD.plazoParaResponder
  }
  return undefined
}
