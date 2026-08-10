/**
 * acuerdo-general.ts — el marco que el agente puede cerrar SOLO, dicho en
 * palabras.
 *
 * Un acuerdo puntual se arma para una persona. El acuerdo GENERAL es la regla:
 * «si el deudor cabe en estas condiciones, tomalo y no me preguntes». Vive en
 * la política de la agencia (`GET/PATCH /api/agency/:id/policy`) y el agente ya
 * la lee en cada negociación.
 *
 * Estas funciones viven aparte del componente porque la decisión que codifican
 * —cuándo el acuerdo se contradice— no es de presentación, y porque se leen
 * desde Acuerdos de pago.
 */

/** El subconjunto de la política que forma el acuerdo general. */
export interface AcuerdoGeneral {
  maxDiscountPct: number
  maxPlanMonths: number
  minPaymentCop: number
  negotiationMaxAttempts: number
  allowedPaymentPlans: number[]
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * El acuerdo, dicho en una frase.
 *
 * Con once campos sueltos nadie sabe qué quedó acordado. Leer «hasta 20% de
 * descuento, en 3, 6 o 12 cuotas» es la única forma de revisar de un vistazo
 * si dice lo que uno cree.
 */
export function resumenAcuerdo(d: AcuerdoGeneral): string {
  const partes: string[] = []

  partes.push(
    d.maxDiscountPct > 0
      ? `hasta ${Math.round(d.maxDiscountPct * 100)}% de descuento`
      : 'sin descuento',
  )

  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  if (planes.length > 0) {
    const enMeses = planes.map(String)
    const ultimo = enMeses.pop()
    const lista = enMeses.length > 0 ? `${enMeses.join(', ')} o ${ultimo}` : ultimo
    partes.push(`en ${lista} ${planes.length === 1 && planes[0] === 1 ? 'cuota' : 'cuotas'}`)
  } else {
    partes.push('sin plazos a cuotas')
  }

  if (d.minPaymentCop > 0) partes.push(`con un pago mínimo de ${pesos.format(d.minPaymentCop)}`)

  partes.push(
    `y hasta ${d.negotiationMaxAttempts} ${d.negotiationMaxAttempts === 1 ? 'intento' : 'intentos'}`,
  )

  return `El agente puede cerrar solo: ${partes.join(', ')}.`
}

/**
 * Incoherencias que hacen que el acuerdo no diga lo que aparenta.
 *
 * `maxPlanMonths` y `allowedPaymentPlans` NO son el mismo campo: el primero es
 * el tope con el que `calculatePaymentPlan` arma el cronograma; el segundo es
 * la lista blanca que decide si la oferta se cierra sola o se escala. Se pueden
 * contradecir — y hoy, en todos los tenants, se contradicen (`max_plan_months`
 * en 0 con 3, 6 y 12 meses marcados).
 */
export function avisosDelAcuerdo(d: AcuerdoGeneral): string[] {
  const avisos: string[] = []
  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  const mayor = planes[planes.length - 1]

  if (d.maxPlanMonths < 1 && planes.length > 0) {
    avisos.push(
      `El plazo máximo está en ${d.maxPlanMonths}, así que el agente no puede armar ningún cronograma —aunque estén marcados ${planes.join(', ')} meses. Subilo a ${mayor} para que los plazos marcados sirvan.`,
    )
  } else if (mayor !== undefined && d.maxPlanMonths > 0 && mayor > d.maxPlanMonths) {
    avisos.push(
      `Están marcados ${mayor} meses, pero el plazo máximo es ${d.maxPlanMonths}: un deudor que pida ${mayor} cuotas te lo va a escalar en vez de cerrarlo.`,
    )
  }

  if (d.maxDiscountPct === 0 && planes.length === 0) {
    avisos.push(
      'Sin descuento y sin plazos, el agente no tiene nada que ofrecer: todo termina escalado.',
    )
  }

  return avisos
}
