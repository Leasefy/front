/**
 * 🔴 02-10-2026 · Lo que se devuelve del depósito nunca es negativo (Nico): lo
 * que los descuentos pasan del depósito va como un cargo aparte. Espejo de
 * `back/src/inmobiliaria/actas/devolucion-del-deposito.ts` (mismos casos que
 * `crear-un-acta-desde-el-panel.spec.ts` del back).
 */
import { describe, expect, it } from 'vitest'
import { liquidarElDeposito } from './devolucion-del-deposito'
import { errorDeLosDescuentos, MENSAJES_DEL_ACTA } from './limites-del-acta'

describe('liquidarElDeposito', () => {
  it('descuentos por debajo del depósito: se devuelve la diferencia', () => {
    expect(liquidarElDeposito(1_000_000, [{ amount: 300_000 }])).toEqual({
      descontadoCop: 300_000,
      aDevolverCop: 700_000,
      aCargoDelInquilinoCop: 0,
    })
  })

  it('🔴 descuentos por encima: se devuelve 0 y lo de más va aparte', () => {
    expect(liquidarElDeposito(1_000_000, [{ amount: 1_200_000 }, { amount: 300_000 }])).toEqual({
      descontadoCop: 1_500_000,
      aDevolverCop: 0,
      aCargoDelInquilinoCop: 500_000,
    })
  })

  it('lo que no es un entero ≥ 0 no cuenta', () => {
    expect(liquidarElDeposito(1_000_000, [{ amount: -500_000 }, { amount: 'x' }]).aDevolverCop).toBe(1_000_000)
  })
})

describe('errorDeLosDescuentos', () => {
  it('renglones vacíos no opinan; sin concepto o con ceros de más, la frase del back', () => {
    expect(errorDeLosDescuentos([{ concept: '', amount: 0 }])).toBeNull()
    expect(errorDeLosDescuentos([{ concept: '', amount: 100 }])).toBe(MENSAJES_DEL_ACTA.conceptoDelDescuento)
    expect(errorDeLosDescuentos([{ concept: 'Aseo', amount: 30_000_000_000 }])).toBe(MENSAJES_DEL_ACTA.descuentoMaximo)
    expect(errorDeLosDescuentos([{ concept: 'Aseo', amount: 300_000 }])).toBeNull()
  })
})
