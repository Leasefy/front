/**
 * Los topes de lo que una persona escribe en la conciliación, atajados ANTES
 * de enviar (02-10-2026, tanda 2 de errores, A6).
 *
 * Espejo de los esquemas del micro (`agent/src/server/routes/conciliacion-*.ts`)
 * y, donde el micro no topa, de la columna que lo guarda: lo que el micro
 * rechazaría (o lo que haría reventar la base con un 500) se dice en el campo,
 * en español, sin viajar.
 */

// ── Rechazar un cruce (`conciliacion-queue.ts`, `RejectBody`) ───────────────

/** El micro pide `reason` con `.min(1)`; la pantalla pide una frase de verdad. */
export const LARGO_MINIMO_DEL_MOTIVO_DE_RECHAZO = 5
/** El micro no topa el motivo; la pantalla sí (queda en la auditoría). */
export const LARGO_MAXIMO_DEL_MOTIVO_DE_RECHAZO = 300

// ── Generar una liquidación (`conciliacion-settlements.ts`, `GenerateBody`) ──

/** `period: z.string().min(1).max(64)`. */
export const LARGO_MAXIMO_DEL_PERIODO = 64
/** `ownerName: z.string().min(1).max(200)`. */
export const LARGO_MAXIMO_DEL_PROPIETARIO = 200
/**
 * Las cifras son `Int` en la base (`OwnerSettlement.grossCop`, `commissionCop`,
 * `otherDeductionsCop`, `netCop`): por encima de 2.147.483.647 la escritura
 * revienta con un 500. El micro sólo pide `.int().nonnegative()`; el tope va
 * acá, en una cifra que se lee, por debajo del máximo de la columna.
 */
export const MONTO_MAXIMO_DE_LA_LIQUIDACION = 2_000_000_000

export type CampoDeLaLiquidacion = 'ownerName' | 'period' | 'grossCop' | 'commissionCop' | 'otherDeductionsCop'

export interface LiquidacionEscrita {
  ownerName: string
  period: string
  grossCop: string
  commissionCop: string
  otherDeductionsCop: string
}

const MONTO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/**
 * Lo que está mal en la liquidación ANTES de enviarla, por campo. Vacío =
 * se puede enviar. Las frases son las que la persona lee bajo el campo.
 */
export function erroresDeLaLiquidacion(
  f: LiquidacionEscrita,
): Partial<Record<CampoDeLaLiquidacion, string>> {
  const errores: Partial<Record<CampoDeLaLiquidacion, string>> = {}
  if (f.ownerName.trim().length > LARGO_MAXIMO_DEL_PROPIETARIO) {
    errores.ownerName = `El nombre del propietario no puede pasar de ${LARGO_MAXIMO_DEL_PROPIETARIO} caracteres.`
  }
  if (f.period.trim().length > LARGO_MAXIMO_DEL_PERIODO) {
    errores.period = `El periodo no puede pasar de ${LARGO_MAXIMO_DEL_PERIODO} caracteres.`
  }
  const montos: Array<[CampoDeLaLiquidacion, string, string]> = [
    ['grossCop', f.grossCop, 'El canon recaudado'],
    ['commissionCop', f.commissionCop, 'La comisión'],
    ['otherDeductionsCop', f.otherDeductionsCop, 'Los otros descuentos'],
  ]
  for (const [campo, crudo, nombre] of montos) {
    const texto = crudo.trim()
    if (!texto) continue
    const n = Number(texto)
    if (!Number.isFinite(n) || n < 0) {
      errores[campo] = `${nombre} debe ser una cifra en pesos, sin signos.`
    } else if (Math.trunc(n) > MONTO_MAXIMO_DE_LA_LIQUIDACION) {
      errores[campo] = `${nombre} no puede pasar de $${MONTO.format(MONTO_MAXIMO_DE_LA_LIQUIDACION)}.`
    }
  }
  return errores
}
