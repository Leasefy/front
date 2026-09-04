/**
 * El rango de meses del reporte de rentabilidad, calculado en el cliente.
 *
 * El back recibe `desde`/`hasta` en `YYYY-MM`, acepta hasta 24 meses y
 * responde 400 si el rango no cierra. Validar acá antes de pedir evita
 * mandar una consulta que ya se sabe inválida y deja el mensaje al lado del
 * control que lo causó, no en un toast.
 *
 * Todo trabaja sobre `YYYY-MM` como texto, en hora LOCAL: un `Date` en UTC
 * puede ser el mes anterior en Bogotá a la medianoche del día 1.
 */

export type PresetDePeriodo = '3m' | '6m' | '12m' | 'anio' | 'libre'

export const PRESETS_DE_PERIODO: readonly PresetDePeriodo[] = ['3m', '6m', '12m', 'anio', 'libre']

/** Lo que acepta el back. */
export const MAXIMO_DE_MESES = 24

export interface RangoDeMeses {
  /** `YYYY-MM` */
  desde: string
  /** `YYYY-MM` */
  hasta: string
}

const FORMA = /^(\d{4})-(0[1-9]|1[0-2])$/

export function esMes(valor: string): boolean {
  return FORMA.test(valor)
}

function partes(ym: string): { anio: number; mes: number } {
  const m = FORMA.exec(ym)
  if (!m) throw new Error(`Mes inválido: ${ym}`)
  return { anio: Number(m[1]), mes: Number(m[2]) }
}

function armar(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`
}

/** `2026-09` para el 2 de septiembre de 2026, en hora local. */
export function mesDe(fecha: Date): string {
  return armar(fecha.getFullYear(), fecha.getMonth() + 1)
}

/** `sumarMeses('2026-01', -1)` → `2025-12`. */
export function sumarMeses(ym: string, n: number): string {
  const { anio, mes } = partes(ym)
  const indice = anio * 12 + (mes - 1) + n
  return armar(Math.floor(indice / 12), (indice % 12) + 1)
}

/** Meses que abarca el rango, contando los dos extremos. `2026-01`→`2026-03` = 3. */
export function mesesEntre(desde: string, hasta: string): number {
  const a = partes(desde)
  const b = partes(hasta)
  return b.anio * 12 + b.mes - (a.anio * 12 + a.mes) + 1
}

/**
 * El rango que representa cada opción rápida. «Últimos N meses» termina en el
 * mes actual e incluye N meses en total; «este año» va de enero al mes actual.
 * `libre` no tiene rango propio: devuelve el default del back (12 meses).
 */
export function rangoDelPreset(preset: PresetDePeriodo, hoy: Date = new Date()): RangoDeMeses {
  const hasta = mesDe(hoy)
  switch (preset) {
    case '3m':
      return { desde: sumarMeses(hasta, -2), hasta }
    case '6m':
      return { desde: sumarMeses(hasta, -5), hasta }
    case 'anio':
      return { desde: armar(hoy.getFullYear(), 1), hasta }
    case '12m':
    case 'libre':
    default:
      return { desde: sumarMeses(hasta, -11), hasta }
  }
}

/**
 * Por qué el rango no sirve, en una frase para mostrar al lado del control.
 * `null` cuando está bien.
 */
export function validarRango(desde: string, hasta: string): string | null {
  if (!esMes(desde) || !esMes(hasta)) return 'Elegí un mes de inicio y uno de fin.'
  if (desde > hasta) return 'El mes de inicio tiene que ser anterior o igual al de fin.'
  const meses = mesesEntre(desde, hasta)
  if (meses > MAXIMO_DE_MESES) {
    return `El rango abarca ${meses} meses; el máximo es ${MAXIMO_DE_MESES}.`
  }
  return null
}

/** «sep 2026» / «Sep 2026», según el idioma. */
export function etiquetaDelMes(ym: string, locale: 'es' | 'en' = 'es'): string {
  if (!esMes(ym)) return ym
  const { anio, mes } = partes(ym)
  const fecha = new Date(anio, mes - 1, 1)
  return fecha.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', { month: 'short', year: 'numeric' })
}
