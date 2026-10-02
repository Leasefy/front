/**
 * Los topes de la modalidad del mandato y del retiro de la administración, en
 * el cliente (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/mandato/dto/mandato.dto.ts`:
 *   · `MandatoDeLaConsignacionDto.interesesAlPropietarioPct`:
 *     `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(99.99)`;
 *   · `RetiroDeAdministracionDto.motivo`: `@MaxLength(500)`;
 *   · `RetiroDeAdministracionDto.fechaDeCorte`: `@IsDateString({ strict: true })`.
 *
 * Lo que el back rechaza se ataja antes de mandar, en el campo que lo causó.
 */

export const PORCENTAJE_DEL_REPARTO_MINIMO = 0.01
export const PORCENTAJE_DEL_REPARTO_MAXIMO = 99.99
export const MAX_LARGO_DEL_MOTIVO_DEL_RETIRO = 500

export const MENSAJES_DEL_MANDATO = {
  porcentajeFueraDeRango:
    'El reparto necesita el porcentaje del propietario, mayor que 0 y menor que 100.',
  porcentajeConDecimales: 'El porcentaje puede tener hasta dos decimales.',
  fechaDeCorte: 'Elige el último día que administra la inmobiliaria.',
  motivoLargo: 'El motivo puede tener hasta 500 caracteres.',
} as const

/** El porcentaje del reparto leído como lo escribe una persona («50», «33,5»). */
export function leerPorcentaje(texto: string): number {
  const limpio = texto.trim().replace(',', '.')
  return limpio === '' ? Number.NaN : Number(limpio)
}

/** El error del porcentaje del reparto, o `null` si el back lo va a aceptar. */
export function errorDelPorcentajeDelReparto(texto: string): string | null {
  const n = leerPorcentaje(texto)
  if (!Number.isFinite(n) || n < PORCENTAJE_DEL_REPARTO_MINIMO || n > PORCENTAJE_DEL_REPARTO_MAXIMO) {
    return MENSAJES_DEL_MANDATO.porcentajeFueraDeRango
  }
  // `maxDecimalPlaces: 2`: 33,333 no pasa en el back.
  if (Math.round(n * 100) / 100 !== n) return MENSAJES_DEL_MANDATO.porcentajeConDecimales
  return null
}

/** Un día real `AAAA-MM-DD` (lo que manda un `<input type="date">` lleno). */
export function errorDeLaFechaDeCorte(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  if (!m) return MENSAJES_DEL_MANDATO.fechaDeCorte
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor.trim()
    ? MENSAJES_DEL_MANDATO.fechaDeCorte
    : null
}

export function errorDelMotivoDelRetiro(motivo: string): string | null {
  return motivo.trim().length > MAX_LARGO_DEL_MOTIVO_DEL_RETIRO ? MENSAJES_DEL_MANDATO.motivoLargo : null
}
