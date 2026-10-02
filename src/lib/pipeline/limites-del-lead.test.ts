/**
 * 02-10-2026 · El espejo de los topes del lead: las MISMAS cifras y frases que
 * `back/src/inmobiliaria/leads/limites-del-lead.ts` (decisión de Nico: el
 * presupuesto lleva sólo el tope de la columna).
 */
import { describe, expect, it } from 'vitest'
import {
  MENSAJES_DEL_LEAD,
  PRESUPUESTO_MAXIMO_DEL_LEAD_COP,
  revisarPlazoParaResponder,
  revisarPresupuestoDelLead,
} from './limites-del-lead'
import { MENSAJES_DEL_PIPELINE, revisarMotivoDePerdida } from './limites-del-pipeline'

describe('revisarPresupuestoDelLead', () => {
  it('🔴 la frase es la de Nico, palabra por palabra', () => {
    expect(MENSAJES_DEL_LEAD.presupuestoMaximo).toBe(
      'El presupuesto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    )
  })

  it('vacío está bien: el campo es opcional', () => {
    expect(revisarPresupuestoDelLead(undefined)).toBeUndefined()
    expect(revisarPresupuestoDelLead(null)).toBeUndefined()
  })

  it('el tope justo pasa y un peso más no', () => {
    expect(revisarPresupuestoDelLead(PRESUPUESTO_MAXIMO_DEL_LEAD_COP)).toBeUndefined()
    expect(revisarPresupuestoDelLead(PRESUPUESTO_MAXIMO_DEL_LEAD_COP + 1)).toBe(MENSAJES_DEL_LEAD.presupuestoMaximo)
  })

  it('🔴 la cifra que daba P2020 se ataja antes de mandar', () => {
    expect(revisarPresupuestoDelLead(30_000_000_000)).toBe(MENSAJES_DEL_LEAD.presupuestoMaximo)
  })

  it('cero y los decimales dicen su frase', () => {
    expect(revisarPresupuestoDelLead(0)).toBe(MENSAJES_DEL_LEAD.presupuestoMinimo)
    expect(revisarPresupuestoDelLead(1_500_000.5)).toBe(MENSAJES_DEL_LEAD.presupuestoEntero)
  })

  it('el tope cabe en la columna int4', () => {
    expect(PRESUPUESTO_MAXIMO_DEL_LEAD_COP).toBeLessThanOrEqual(2_147_483_647)
  })
})

describe('revisarPlazoParaResponder', () => {
  it.each([['0'], ['721'], ['-3']])('%s horas dice el rango', (texto) => {
    expect(revisarPlazoParaResponder(texto)).toBe(MENSAJES_DEL_LEAD.plazoParaResponder)
  })

  it('1 y 720 pasan; vacío no opina', () => {
    expect(revisarPlazoParaResponder('1')).toBeUndefined()
    expect(revisarPlazoParaResponder('720')).toBeUndefined()
    expect(revisarPlazoParaResponder('  ')).toBeUndefined()
  })

  it('con decimales pide horas enteras', () => {
    expect(revisarPlazoParaResponder('2.5')).toBe(MENSAJES_DEL_LEAD.plazoParaResponderEntero)
  })
})

describe('revisarMotivoDePerdida', () => {
  it('500 caracteres pasan y 501 dicen la frase del back', () => {
    expect(revisarMotivoDePerdida('m'.repeat(500))).toBeUndefined()
    expect(revisarMotivoDePerdida('m'.repeat(501))).toBe(MENSAJES_DEL_PIPELINE.motivoLargo)
  })
})
