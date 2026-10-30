import { enPartesIguales } from './meses-del-concepto'

/**
 * En cuántos meses diferir una reparación (Nico, 28-10-2026, reunión de mantenimiento): «que le dé la sugerencia a
 * cuántos meses según la cotización se le va a descontar… tener en cuenta el valor del canon». El tope del mes es un %
 * del canon que fija cada inmobiliaria en Configuración → Reparaciones (30 % si no lo fijó; lo manda el back).
 *
 * Se sugiere el MENOR número de meses en que, repartido en partes iguales (la misma cuenta de `enPartesIguales`, con la
 * diferencia en el último), ningún mes pasa del tope. Si el contrato no tiene tantos meses por delante, se sugieren los
 * que quedan y se dice que cada uno pasa del tope. Es una sugerencia: la persona elige los meses que quiera.
 */
export interface SugerenciaDeMeses {
  /** Los meses que se sugieren (nunca más de los que quedan). */
  meses: number
  /** Los que harían falta para no pasar del tope. */
  necesarios: number
  /** Lo máximo por mes: el canon por el tope. */
  topeCop: number
  /** El mes más alto del reparto sugerido. */
  cuotaMasAltaCop: number
  /** ¿El contrato tiene esos meses por delante? */
  alcanza: boolean
}

/** Más que esto no es diferir, es otro contrato. */
const MESES_MAXIMOS = 120

export function sugerenciaDeMeses({
  totalCop,
  canonCop,
  topePct,
  mesesQueQuedan,
  conCentavos = false,
}: {
  totalCop: number
  canonCop: number | null | undefined
  topePct: number | null | undefined
  mesesQueQuedan: number
  conCentavos?: boolean
}): SugerenciaDeMeses | null {
  if (!(totalCop > 0) || !canonCop || !(canonCop > 0) || !topePct || !(topePct > 0) || !(mesesQueQuedan > 0)) return null
  const topeCop = (canonCop * topePct) / 100
  const masAlta = (n: number) =>
    Math.max(...enPartesIguales(totalCop, Array.from({ length: n }, (_, i) => String(i)), conCentavos).map((p) => p.valorCop))
  // redondeo: no es plata (cuántos meses, desde donde se empieza a probar)
  let necesarios = Math.max(1, Math.ceil(totalCop / topeCop))
  while (necesarios < MESES_MAXIMOS && masAlta(necesarios) > topeCop) necesarios += 1
  const meses = Math.min(necesarios, mesesQueQuedan)
  return { meses, necesarios, topeCop, cuotaMasAltaCop: masAlta(meses), alcanza: necesarios <= mesesQueQuedan }
}
