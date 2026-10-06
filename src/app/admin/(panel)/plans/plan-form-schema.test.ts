/**
 * Los topes del formulario de planes del admin: el espejo de los DTO del back
 * (02-10-2026). Sin ellos, un precio de once cifras llegaba a una columna
 * `int4` y el back respondía 500 (P2020).
 */
import { describe, it, expect } from 'vitest'
import { MENSAJES_DEL_PLAN, PLAN_FORM_DEFAULTS, planFormSchema, toCreatePlanBody, type PlanFormValues } from './plan-form-schema'

function errores(cambio: Partial<PlanFormValues>): Record<string, string> {
  const r = planFormSchema.safeParse({ ...PLAN_FORM_DEFAULTS, name: 'Pro', ...cambio })
  if (r.success) return {}
  return Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))
}

describe('planFormSchema — los topes del back', () => {
  it('lo válido pasa, incluso en el borde', () => {
    expect(
      errores({
        monthlyPrice: '1000000000',
        maxProperties: '1000000',
        maxUsers: '-1',
        monthlyCreditGrant: '1000000',
        name: 'x'.repeat(100),
      }),
    ).toEqual({})
  })

  it('🔴 un precio de once cifras no sale, con la frase del back', () => {
    expect(errores({ monthlyPrice: '30000000000' }).monthlyPrice).toBe(MENSAJES_DEL_PLAN.precioMaximo)
    expect(errores({ scoringViewPrice: '1000000001' }).scoringViewPrice).toBe(MENSAJES_DEL_PLAN.precioMaximo)
  })

  it('los límites, los créditos y el nombre', () => {
    expect(errores({ maxUsers: '1000001' }).maxUsers).toBe(MENSAJES_DEL_PLAN.limiteMaximo)
    expect(errores({ monthlyCreditGrant: '1000001' }).monthlyCreditGrant).toBe(MENSAJES_DEL_PLAN.creditosMaximos)
    expect(errores({ name: 'x'.repeat(101) }).name).toBe(MENSAJES_DEL_PLAN.nombreLargo)
  })

  it('la comisión por uso: 100 % (10.000 puntos básicos) es el tope', () => {
    expect(errores({ billingMode: 'USAGE_CANON', usageFeePct: '100' })).toEqual({})
    expect(errores({ billingMode: 'USAGE_CANON', usageFeePct: '100.01' }).usageFeePct).toBe(MENSAJES_DEL_PLAN.comisionMaxima)
    expect(toCreatePlanBody({ ...PLAN_FORM_DEFAULTS, name: 'Flex', billingMode: 'USAGE_CANON', usageFeePct: '100' }).usageFeeBps).toBe(10_000)
  })
})
