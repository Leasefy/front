/**
 * El aviso de umbral del reporte diario de cobranza, en el idioma del panel
 * (Nico, 16-10-2026: «si el usuario colocó la plataforma en inglés debe de
 * contestar en inglés»).
 *
 * El micro manda `message_es` ya redactado (`daily-report-thresholds.ts`) y,
 * además, el `code`, la cifra de hoy (`current`) y el umbral (`threshold`). Con
 * esos tres el inglés se escribe acá, con el mismo sentido que el español. Un
 * código que no se conoce queda con el español del micro: nunca se inventa.
 */

import type { Locale } from '@/lib/i18n/types'

export interface AvisoDelReporte {
  code: string
  message_es: string
  current: number
  threshold: number
}

function porcentaje(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

const EN: Record<string, (a: AvisoDelReporte) => string> = {
  COMPLIANCE_VIOLATIONS: (a) => `Compliance violations today: ${a.current} (threshold: ${a.threshold}).`,
  CALLS_OUTSIDE_WINDOW: (a) => `Contacts outside Ley 2300 hours today: ${a.current} (threshold: ${a.threshold}).`,
  PKR_LOW: (a) =>
    `Promises kept over the last 7 days are at ${porcentaje(a.current)}: below the ${porcentaje(a.threshold)} you set.`,
  INDICE_MOROSIDAD_HIGH: (a) =>
    `The delinquency rate is at ${porcentaje(a.current)}: above the ${porcentaje(a.threshold)} you set.`,
}

export function textoDelAviso(aviso: AvisoDelReporte, locale: Locale): string {
  if (locale !== 'en') return aviso.message_es
  const armar = EN[aviso.code]
  if (!armar || !Number.isFinite(aviso.current) || !Number.isFinite(aviso.threshold)) return aviso.message_es
  return armar(aviso)
}
