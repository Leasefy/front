import { describe, it, expect } from 'vitest'

import { resumenAcuerdo, avisosDelAcuerdo, type AcuerdoGeneral } from './acuerdo-general'

const base: AcuerdoGeneral = {
  maxDiscountPct: 0.2,
  maxPlanMonths: 12,
  minPaymentCop: 200_000,
  negotiationMaxAttempts: 6,
  allowedPaymentPlans: [3, 6, 12],
}

/**
 * `Intl` en es-CO separa el `$` con un espacio DURO (U+00A0). Comparar contra
 * un espacio normal falla mostrando dos cadenas idénticas en pantalla.
 */
const sinEspacioDuro = (s: string) => s.replace(/ /g, ' ')

describe('resumenAcuerdo', () => {
  it('dice el acuerdo completo en una frase', () => {
    expect(sinEspacioDuro(resumenAcuerdo(base))).toBe(
      'El agente puede cerrar solo: hasta 20% de descuento, en 3, 6 o 12 cuotas, con un pago mínimo de $ 200.000, y hasta 6 intentos.',
    )
  })

  it('el descuento se lee en porcentaje, no en fracción', () => {
    // 0.2 es «20%». Mostrarlo crudo diría «0.2%», cien veces menos.
    expect(resumenAcuerdo(base)).toContain('20% de descuento')
    expect(resumenAcuerdo(base)).not.toContain('0.2%')
  })

  it('sin descuento lo dice, no muestra 0%', () => {
    expect(resumenAcuerdo({ ...base, maxDiscountPct: 0 })).toContain('sin descuento')
  })

  it('omite el pago mínimo cuando es 0 en vez de decir «mínimo $0»', () => {
    expect(resumenAcuerdo({ ...base, minPaymentCop: 0 })).not.toContain('mínimo')
  })

  it('sin plazos marcados lo dice', () => {
    expect(resumenAcuerdo({ ...base, allowedPaymentPlans: [] })).toContain('sin plazos a cuotas')
  })

  it('un solo plazo no lleva «o»', () => {
    expect(resumenAcuerdo({ ...base, allowedPaymentPlans: [6] })).toContain('en 6 cuotas')
  })

  it('ordena los plazos aunque lleguen desordenados', () => {
    expect(resumenAcuerdo({ ...base, allowedPaymentPlans: [12, 3, 6] })).toContain('en 3, 6 o 12')
  })

  it('singular en el intento', () => {
    expect(resumenAcuerdo({ ...base, negotiationMaxAttempts: 1 })).toContain('hasta 1 intento.')
  })
})

describe('avisosDelAcuerdo', () => {
  it('un acuerdo coherente no genera avisos', () => {
    expect(avisosDelAcuerdo(base)).toEqual([])
  })

  it('avisa cuando el plazo máximo es 0 y hay plazos marcados', () => {
    // El caso real de TODOS los tenants: max_plan_months = 0 con [3,6,12].
    const avisos = avisosDelAcuerdo({ ...base, maxPlanMonths: 0 })
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toContain('no puede armar ningún cronograma')
    expect(avisos[0]).toContain('Subilo a 12')
  })

  it('avisa cuando un plazo marcado supera el tope', () => {
    const avisos = avisosDelAcuerdo({ ...base, maxPlanMonths: 6 })
    expect(avisos[0]).toContain('te lo va a escalar')
  })

  it('no avisa cuando el tope es mayor que el plazo más largo', () => {
    expect(avisosDelAcuerdo({ ...base, maxPlanMonths: 24 })).toEqual([])
  })

  it('avisa cuando no hay nada que ofrecer', () => {
    const avisos = avisosDelAcuerdo({
      ...base,
      maxDiscountPct: 0,
      allowedPaymentPlans: [],
      maxPlanMonths: 12,
    })
    expect(avisos.some((a) => a.includes('todo termina escalado'))).toBe(true)
  })
})
