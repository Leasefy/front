/**
 * La venta del inmueble en el cliente: «Registrar la venta» y la anulación de
 * la comisión de venta (Nico, 02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/captacion/limites-de-la-captacion.ts`
 * (`PRECIO_DE_VENTA_MAXIMO_COP`, `MOTIVO_DE_ANULACION_DE_LA_COMISION_*` y sus
 * frases) y de los DTO `PrevisualizarVentaDto`, `RegistrarComisionDeVentaDto` y
 * `AnularComisionDeVentaDto`: mismos números y mismas frases. Lo que el back
 * rechaza se ataja ANTES de mandar, y en el campo que lo causó.
 */

import { leerFallo } from '@/lib/errores/traductor-de-errores'
import {
  FECHA_DE_LA_CAPTACION_DESDE,
  FECHA_DE_LA_CAPTACION_HASTA,
  esDiaDelCalendario,
} from './limites-de-la-captacion'

/** El precio de la escritura más alto: el techo de `Property.salePrice`. */
export const PRECIO_DE_LA_ESCRITURA_MAXIMO_COP = 100_000_000_000

/** El motivo de anular la comisión, medido sin los espacios de los bordes. */
export const MOTIVO_DE_ANULACION_MINIMO = 5
export const MOTIVO_DE_ANULACION_MAXIMO = 500

/** Sin la tabla `comisiones_de_venta` el back responde 503 con este código. */
export const CODIGO_COMISION_SIN_MIGRACION = 'COMISION_DE_VENTA_SIN_MIGRACION'

export const MENSAJES_DE_LA_VENTA = {
  escrituraNoEsUnDia:
    'La fecha de la escritura no es un día real del calendario (usa AAAA-MM-DD).',
  escrituraFueraDeRango: 'La fecha de la escritura debe estar entre el año 1950 y el 2100.',
  precioFalta: 'Escribe el precio de la escritura: la comisión se cobra sobre lo que se escrituró.',
  precioMinimo: 'El precio de la escritura debe ser mayor que cero.',
  precioMaximo:
    'El precio de la escritura no puede pasar de $100.000.000.000. Revisa que no sobren ceros.',
  motivoDeAnulacionCorto:
    'Escribe por qué se anula la comisión, con al menos 5 caracteres: es el registro que queda.',
  motivoDeAnulacionLargo: 'El motivo puede tener hasta 500 caracteres.',
  /**
   * La frase de la pantalla cuando la base no tiene la tabla. El back nombra
   * la migración (para quien la aplica); a la inmobiliaria se le dice qué
   * pasa, sin jerga.
   */
  sinMigracion:
    'Todavía no se puede registrar la comisión de venta: a la plataforma le falta una actualización. Cuando esté, la registras desde aquí.',
} as const

/** El error de la fecha de la escritura, o `null` si está bien. */
export function errorDeLaFechaDeLaEscritura(valor: string): string | null {
  if (!esDiaDelCalendario(valor)) return MENSAJES_DE_LA_VENTA.escrituraNoEsUnDia
  const dia = valor.trim().slice(0, 10)
  if (dia < FECHA_DE_LA_CAPTACION_DESDE || dia > FECHA_DE_LA_CAPTACION_HASTA) {
    return MENSAJES_DE_LA_VENTA.escrituraFueraDeRango
  }
  return null
}

/** El error del precio (dígitos pelados, como los entrega `MoneyInput`), o `null`. */
export function errorDelPrecioDeLaEscritura(crudo: string): string | null {
  const limpio = crudo.trim()
  if (!limpio) return MENSAJES_DE_LA_VENTA.precioFalta
  const precio = Number(limpio)
  if (!Number.isInteger(precio) || precio < 1) return MENSAJES_DE_LA_VENTA.precioMinimo
  if (precio > PRECIO_DE_LA_ESCRITURA_MAXIMO_COP) return MENSAJES_DE_LA_VENTA.precioMaximo
  return null
}

/** El error del motivo de la anulación, o `null` si está bien. */
export function errorDelMotivoDeAnulacion(motivo: string): string | null {
  const limpio = motivo.trim()
  if (limpio.length < MOTIVO_DE_ANULACION_MINIMO) return MENSAJES_DE_LA_VENTA.motivoDeAnulacionCorto
  if (limpio.length > MOTIVO_DE_ANULACION_MAXIMO) return MENSAJES_DE_LA_VENTA.motivoDeAnulacionLargo
  return null
}

/** ¿El fallo es «la base no tiene la tabla de las comisiones»? */
export function esComisionSinMigracion(error: unknown): boolean {
  return leerFallo(error).code === CODIGO_COMISION_SIN_MIGRACION
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** `2026-10-15` (o un ISO con hora) → «15 de octubre de 2026», sin correr el día por la zona. */
export function diaLegible(dia: string): string {
  const [anio, mes, d] = dia.slice(0, 10).split('-').map(Number)
  if (!anio || !mes || !d) return dia
  return `${d} de ${MESES[mes - 1]} de ${anio}`
}

/** El instante de un registro, en el día de Colombia: «15 de octubre de 2026». */
export function diaEnColombia(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
  return diaLegible(partes)
}

/** `3` → «3 %»; `2.5` → «2,5 %». */
export function porcentajeLegible(porcentaje: number): string {
  return `${porcentaje.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`
}
