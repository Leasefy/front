/**
 * Los topes del pago de un estudio, con las MISMAS cifras y frases que el
 * back (02-10-2026).
 *
 * `valorCop` va a `pagos_de_estudio.valor_cop` (`int4`) y el DTO sólo pedía
 * «mayor que cero»: un valor con ceros de más daba un 500 (P2020). El back ya
 * lo para con una frase; acá se ataja antes de mandar.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/estudios/limites-del-estudio.ts` (y de
 * `@MaxLength(120)` de la referencia en `RegistrarPagoDeEstudioDto`). Si
 * cambia uno, cambia el otro.
 *
 * Ojo: `src/lib/estudio/limites-del-estudio.ts` (en singular) es otro
 * archivo, el de la solicitud del estudio del inquilino.
 */

import { esDiaDelCalendario } from '@/lib/contratos/limites-del-contrato'

export const VALOR_MAXIMO_DEL_ESTUDIO_COP = 2_000_000_000
export const MAX_LARGO_REFERENCIA_DEL_PAGO = 120

/**
 * El rango del día del pago (`fecha`, opcional: sin ella el back usa hoy).
 * Ninguna pantalla manda hoy la fecha del pago; van para cuando una lo haga.
 */
export const FECHA_DEL_PAGO_DEL_ESTUDIO_DESDE = '2000-01-01'
export const FECHA_DEL_PAGO_DEL_ESTUDIO_HASTA = '2100-12-31'

export const MENSAJES_DEL_ESTUDIO = {
  valorEntero: 'El valor del estudio debe ser un número entero de pesos, sin decimales.',
  valorMinimo: 'El valor del estudio debe ser mayor que cero.',
  valorMaximo: 'El valor del estudio no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  // 🔴 02-10-2026 · Las fechas que se corrían (`2026-02-31` → 3 de marzo).
  fechaDelPago: 'La fecha del pago no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDelPagoFueraDeRango: 'La fecha del pago debe estar entre el año 2000 y el 2100.',
} as const

/** La fecha del pago, revisada como la revisa el back. Vacía = el back usa hoy. */
export function revisarFechaDelPagoDelEstudio(valor: string | null | undefined): string | undefined {
  const dia = valor?.trim()
  if (!dia) return undefined
  if (!esDiaDelCalendario(dia)) return MENSAJES_DEL_ESTUDIO.fechaDelPago
  const soloElDia = dia.slice(0, 10)
  return soloElDia < FECHA_DEL_PAGO_DEL_ESTUDIO_DESDE || soloElDia > FECHA_DEL_PAGO_DEL_ESTUDIO_HASTA
    ? MENSAJES_DEL_ESTUDIO.fechaDelPagoFueraDeRango
    : undefined
}

/** El valor que pagó, revisado como lo revisa el back. `null` = vacío. */
export function revisarValorDelEstudio(valor: number | null): string | undefined {
  if (valor === null) return undefined
  if (!Number.isInteger(valor)) return MENSAJES_DEL_ESTUDIO.valorEntero
  if (valor < 1) return MENSAJES_DEL_ESTUDIO.valorMinimo
  if (valor > VALOR_MAXIMO_DEL_ESTUDIO_COP) return MENSAJES_DEL_ESTUDIO.valorMaximo
  return undefined
}
