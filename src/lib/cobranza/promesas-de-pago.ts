/**
 * Las promesas de pago cerradas contra la plata real (07-10-2026, Nico).
 *
 * Reglas (las mismas del micro, `cartera/cierre-de-promesas.ts`):
 *   · cumplida = pagó el monto prometido hasta la fecha + N días de gracia;
 *   · N es de cada inmobiliaria: 7 por defecto, de 0 a 60;
 *   · un pago parcial es INCUMPLIDA: el resto se sigue debiendo y Laura
 *     sigue llamando a cobrarlo;
 *   · cuentan todos los recibos del back, no el «ya pagué» dicho.
 *
 * El micro cierra cada mañana; aquí sólo se dice lo que cerró.
 */

import { diaLegible } from '@/lib/contabilidad/fechas'

export const DIAS_DE_GRACIA_POR_DEFECTO = 7
export const DIAS_DE_GRACIA_MAXIMOS = 60

/** El mismo rango que el micro: un entero de 0 a 60. */
export function diasDeGraciaValidos(texto: string): number | null {
  const t = texto.trim()
  if (!/^\d{1,2}$/.test(t)) return null
  const n = Number(t)
  return n <= DIAS_DE_GRACIA_MAXIMOS ? n : null
}

/** «sin días de gracia», «con 1 día de gracia», «con 7 días de gracia». */
export function conLosDiasDeGracia(dias: number): string {
  if (dias === 0) return 'sin días de gracia'
  return dias === 1 ? 'con 1 día de gracia' : `con ${dias} días de gracia`
}

/** Espejo de `cierre` en `CobranzaPromiseItem` del micro. */
export interface CierreDeLaPromesa {
  resultado: 'cumplida' | 'incumplida'
  /** Lo que entró al back en la ventana, en pesos. */
  pagado: number
  /** Último día de la ventana (`YYYY-MM-DD`): la fecha prometida + los días de gracia. */
  hasta: string
  diasDeGracia: number
  cerradaAt: string
}

/**
 * La frase del cierre para la persona:
 *   «Cumplida: pagó $ 500.000 hasta el 14 oct 2026 (con 7 días de gracia).»
 *   «Incumplida: pagó $ 200.000 de $ 500.000 hasta el 14 oct 2026 (…). Sigue debiendo $ 300.000.»
 *   «Incumplida: no entró ningún pago hasta el 14 oct 2026 (…).»
 */
export function fraseDelCierre(
  cierre: CierreDeLaPromesa,
  prometido: number,
  pesos: (n: number) => string,
): string {
  const hasta = `hasta el ${diaLegible(cierre.hasta)} (${conLosDiasDeGracia(cierre.diasDeGracia)})`
  if (cierre.resultado === 'cumplida') {
    return `Cumplida: pagó ${pesos(cierre.pagado)} ${hasta}.`
  }
  if (cierre.pagado <= 0) {
    return `Incumplida: no entró ningún pago ${hasta}.`
  }
  const falta = Math.max(0, prometido - cierre.pagado)
  return `Incumplida: pagó ${pesos(cierre.pagado)} de ${pesos(prometido)} ${hasta}. Sigue debiendo ${pesos(falta)}.`
}
