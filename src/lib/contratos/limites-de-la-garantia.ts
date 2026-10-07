/**
 * La fecha de un movimiento de la garantía de servicios, con las MISMAS
 * frases que el back (02-10-2026).
 *
 * 🔴 Las fechas que se corrían (Nico): `2026-02-31` pasaba el patrón
 * AAAA-MM-DD del back y `new Date` lo corría al 3 de marzo; un año como 1890
 * o 2200 entraba igual. El back ahora responde 400 en `fecha` con estas
 * frases; acá se dice antes de mandar.
 *
 * 🔁 Espejo de `back/src/contracts/garantia-de-servicios/limites-de-la-garantia.ts`.
 * Si cambia uno, cambia el otro.
 */
import { esDiaDelCalendario } from './limites-del-contrato'

export const FECHA_DE_LA_GARANTIA_DESDE = '2000-01-01'
export const FECHA_DE_LA_GARANTIA_HASTA = '2100-12-31'

export const MENSAJES_DE_LA_GARANTIA = {
  fechaDelMovimiento: 'La fecha del movimiento no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDelMovimientoFueraDeRango: 'La fecha del movimiento debe estar entre el año 2000 y el 2100.',
} as const

/** Lo que el back diría de la fecha del movimiento, o `null` si está bien. Vacía = no opina. */
export function errorDeLaFechaDelMovimiento(valor: string | null | undefined): string | null {
  const dia = valor?.trim()
  if (!dia) return null
  if (!esDiaDelCalendario(dia)) return MENSAJES_DE_LA_GARANTIA.fechaDelMovimiento
  const soloElDia = dia.slice(0, 10)
  return soloElDia < FECHA_DE_LA_GARANTIA_DESDE || soloElDia > FECHA_DE_LA_GARANTIA_HASTA
    ? MENSAJES_DE_LA_GARANTIA.fechaDelMovimientoFueraDeRango
    : null
}
