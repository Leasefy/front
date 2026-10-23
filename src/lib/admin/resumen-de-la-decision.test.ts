import { describe, expect, it } from 'vitest'

import { resumenDeLaDecision } from './resumen-de-la-decision'

describe('resumenDeLaDecision', () => {
  it('el cobro retenido dice la cuota, el inmueble, la plata y la persona que trae el payload', () => {
    const r = resumenDeLaDecision('pagos_cobro_retenido', {
      debtor: { id: 'u-1', name: 'Ana Pérez' },
      cobro: { amountCop: 1_250_000, idempotencyKey: 'k' },
      agentContext: { cuotaId: 'c-1', hito: 'antes', fechaDeVencimiento: '2026-10-05', inmueble: 'Apto 301' },
    })
    expect(r).toEqual({
      texto: 'Enlace de pago de la cuota que vence el 5 oct 2026 · Apto 301',
      montoCop: 1_250_000,
      persona: 'Ana Pérez',
    })
  })

  it('después del vencimiento dice «venció»', () => {
    const r = resumenDeLaDecision('pagos_cobro_retenido', {
      cobro: { amountCop: 900_000 },
      agentContext: { cuotaId: 'c-1', hito: 'despues', fechaDeVencimiento: '2026-10-05' },
    })
    expect(r.texto).toBe('Enlace de pago de la cuota que venció el 5 oct 2026')
  })

  it('sin la plata en el payload no la inventa', () => {
    const r = resumenDeLaDecision('pagos_cobro_retenido', { agentContext: { cuotaId: 'c-1' } })
    expect(r).toEqual({ texto: 'Enlace de pago de la cuota', montoCop: null, persona: null })
  })

  it('la carta prejurídica y el reclamo traen la deuda', () => {
    expect(resumenDeLaDecision('pre_judicial_letter', { debt_amount_cop: 3_000_000 }).montoCop).toBe(3_000_000)
    expect(resumenDeLaDecision('siniestro_filing', { insurer: 'Sura', debt_amount_cop: 10 })).toMatchObject({
      texto: 'Reclamo a Sura',
      montoCop: 10,
    })
  })

  it('un tipo sin resumen no pinta el JSON ni un código', () => {
    const r = resumenDeLaDecision('algo_nuevo', { foo: 'bar' })
    expect(r.texto).toBe('Lo que propone está en el detalle')
    expect(r.montoCop).toBeNull()
  })

  it('el acuerdo incumplido dice cuotas y atraso con su plata', () => {
    expect(
      resumenDeLaDecision('acuerdo_incumplido_por_decidir', { cuotasVencidas: 2, diasDeAtraso: 15, montoVencidoCop: 400_000 }),
    ).toEqual({ texto: '2 cuotas vencidas · 15 días de atraso', montoCop: 400_000, persona: null })
  })
})
