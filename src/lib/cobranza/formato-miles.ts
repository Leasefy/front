/**
 * formato-miles.ts — separador de miles para los inputs de dinero en COP.
 *
 * Los `<input type="number">` NO muestran separadores (el navegador los
 * prohíbe), así que un monto largo se lee «2600000» y hay que contar ceros a
 * ojo. Estos helpers dejan el input como `type="text"` mostrando «2.600.000»
 * mientras el estado guarda el número limpio.
 *
 * Punto de miles (es-CO): 2.600.000. Sin decimales — el peso no los usa en
 * cobranza y un decimal en este contexto es casi siempre un error de tipeo.
 */

/** Deja solo dígitos: «2.600.000» / «$ 2.600.000» → «2600000». */
export function soloDigitos(v: string): string {
  return v.replace(/\D/g, '')
}

/** Número limpio (o null si vacío). «2.600.000» → 2600000; «» → null. */
export function parseMiles(v: string): number | null {
  const d = soloDigitos(v)
  if (d === '') return null
  const n = Number(d)
  return Number.isFinite(n) ? n : null
}

/** Formatea con puntos de miles es-CO. 2600000 → «2.600.000». */
export function formatMiles(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

/**
 * Reformatea el texto crudo de un input a miles, conservando lo que el usuario
 * escribe. «2600000» → «2.600.000». Vacío queda vacío (no fuerza un 0).
 */
export function reformatearMiles(v: string): string {
  const n = parseMiles(v)
  return n == null ? '' : formatMiles(n)
}
