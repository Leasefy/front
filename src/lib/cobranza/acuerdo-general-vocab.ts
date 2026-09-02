/**
 * acuerdo-general-vocab.ts — decir un acuerdo general en español.
 *
 * Un acuerdo general es una regla con dos mitades: CUÁNDO aplica y QUÉ ofrece.
 * La tabla del panel muestra las dos como frases, no como columnas de números:
 * «de 16 a 45 días» se entiende; `minDaysOverdue=16, maxDaysOverdue=45` hay que
 * traducirlo mentalmente cada vez.
 *
 * Vive acá y no en el componente porque son reglas —qué significa un rango a
 * medias, qué significa un descuento en 0— y las reglas se prueban.
 */

import type { components } from '@/lib/api/generated/agent'

export type AcuerdoGeneral = components['schemas']['CobranzaAcuerdoGeneral']

export type EtapaCartera = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SX'

export const ETAPAS_ES: Record<EtapaCartera, string> = {
  S0: 'Pre-vencimiento',
  S1: 'Cartera fresca',
  S2: 'Mora administrativa',
  S3: 'Mora pre-jurídica',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico',
  SX: 'Skip / Abandono',
}

/** Orden de negocio, no alfabético: es el recorrido de la mora. */
export const ETAPAS_EN_ORDEN: EtapaCartera[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX']

function pesos(n: number): string {
  return `$${n.toLocaleString('es-CO')}`
}

/**
 * Las condiciones, en frases sueltas. Vacío = aplica siempre.
 *
 * Un rango a medias se dice a medias: «desde 16 días» no es «de 16 a 0».
 */
export function condicionesDe(a: AcuerdoGeneral): string[] {
  const partes: string[] = []

  if (a.stages.length > 0) {
    const nombres = a.stages.map((s) => ETAPAS_ES[s as EtapaCartera] ?? s)
    partes.push(nombres.join(', '))
  }

  const { minDaysOverdue: minD, maxDaysOverdue: maxD } = a
  if (minD !== null && maxD !== null) partes.push(`de ${minD} a ${maxD} días de mora`)
  else if (minD !== null) partes.push(`desde ${minD} días de mora`)
  else if (maxD !== null) partes.push(`hasta ${maxD} días de mora`)

  const { minAmountCop: minM, maxAmountCop: maxM } = a
  if (minM !== null && maxM !== null) partes.push(`entre ${pesos(minM)} y ${pesos(maxM)}`)
  else if (minM !== null) partes.push(`desde ${pesos(minM)}`)
  else if (maxM !== null) partes.push(`hasta ${pesos(maxM)}`)

  return partes
}

/** Una frase para la columna «Cuándo aplica». */
export function cuandoAplica(a: AcuerdoGeneral): string {
  const partes = condicionesDe(a)
  return partes.length === 0 ? 'Cualquier deudor' : partes.join(' · ')
}

/**
 * Qué ofrece, en una frase.
 *
 * El descuento en 0 NO se enuncia: decir «0% de descuento sobre intereses»
 * suena a que hay un descuento y es cero. Si no hay, no se menciona.
 */
export function queOfrece(a: AcuerdoGeneral): string {
  const partes: string[] = []

  // El «sobre qué» manda: un porcentaje con `discountKind: 'none'` es un
  // acuerdo escrito a medias (descuento sobre nada), y el back lo rechaza al
  // prenderlo. No lo enunciamos como «40% sobre intereses» —eso sería afirmar
  // un descuento que no existe—; si la mitad falta, la frase no lo menciona.
  if (a.discountPct > 0 && a.discountKind !== 'none') {
    const sobre =
      a.discountKind === 'intereses_total'
        ? 'de los intereses'
        : 'sobre intereses'
    partes.push(`${a.discountPct}% de descuento ${sobre}`)
  }

  if (a.maxInstallments > 0) {
    partes.push(
      a.maxInstallments === 1 ? 'en 1 cuota' : `en hasta ${a.maxInstallments} cuotas`,
    )
    // El inicial sólo importa si hay cuotas: sin cuotas, el inicial ES el total.
    if (a.minInitialPct > 0 && a.minInitialPct < 100) {
      partes.push(`con ${a.minInitialPct}% inicial`)
    }
  } else {
    partes.push('en un solo pago')
  }

  return partes.join(', ')
}

/**
 * El acuerdo entero dicho de corrido, para el resumen de la fila abierta y
 * para leerlo antes de guardar.
 */
export function resumenAcuerdoGeneral(a: AcuerdoGeneral): string {
  const cuando = condicionesDe(a)
  // Sin preposición: las condiciones ya son frases completas y cada una pide
  // la suya. «A quien esté en» funcionaba con la etapa («en Mora
  // administrativa») y rompía con todo lo demás — «A quien esté en de 16 a 45
  // días de mora», «A quien esté en desde $500.000».
  const alcance =
    cuando.length === 0
      ? 'A cualquier deudor'
      : `Al deudor que cumpla — ${cuando.join(' · ')} —`
  return `${alcance}, el agente le puede ofrecer ${queOfrece(a)} — sin preguntarte.`
}

/**
 * Avisos sobre lo que la agencia acaba de escribir. No son errores de
 * validación (esos los rechaza el back): son cosas válidas que probablemente
 * no hacen lo que su autor cree.
 */
export function avisosDelAcuerdoGeneral(
  a: Pick<
    AcuerdoGeneral,
    'active' | 'discountPct' | 'maxInstallments' | 'minInitialPct' | 'stages'
  >,
): string[] {
  const avisos: string[] = []

  if (!a.active) {
    avisos.push('Está apagado: el agente no lo va a usar hasta que lo prendas.')
  }

  if (a.maxInstallments > 0 && a.minInitialPct === 100) {
    avisos.push(
      'Pide 100% de pago inicial y además ofrece cuotas: con el total pagado por adelantado no queda saldo que financiar.',
    )
  }

  if (a.stages.length === 1 && (a.stages[0] === 'S5' || a.stages[0] === 'SX')) {
    avisos.push(
      'Sólo aplica en una etapa donde ya casi no hay negociación: es probable que nunca se use.',
    )
  }

  return avisos
}
