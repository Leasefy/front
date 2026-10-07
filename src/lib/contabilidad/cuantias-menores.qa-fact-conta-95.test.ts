/**
 * 🔴 QA-FACT-CONTA-95 r2: con el tope de cuantías menores puesto, la pantalla
 * de exógena decía «undefined filas se agrupan en cuantías menores…»: el
 * resumen del back no mandaba cuántas. El back ya lo manda; la frase, si no
 * llega, dice la regla sin inventar un número.
 */
import { describe, expect, it } from 'vitest'

import { frasesDeCuantiasMenores } from './exogena'

const pesos = (n: number) => `$ ${n.toLocaleString('es-CO')}`

describe('cuantías menores de la exógena', () => {
  it('sin el número (back anterior): nunca «undefined»', () => {
    const frase = frasesDeCuantiasMenores({ activa: true, topeCop: 100_000, nit: '222222222' } as never, pesos)
    expect(frase).not.toMatch(/undefined|NaN/)
    expect(frase).toMatch(/se agrupan en cuantías menores \(pagos por debajo de \$ 100\.000\) bajo el NIT 222222222/)
  })

  it('con el número, como siempre', () => {
    expect(frasesDeCuantiasMenores({ activa: true, topeCop: 100_000, nit: '222222222', filas: 1 }, pesos)).toMatch(/^1 fila se agrupa en cuantías menores/)
    expect(frasesDeCuantiasMenores({ activa: true, topeCop: 100_000, nit: '222222222', filas: 43 }, pesos)).toMatch(/^43 filas se agrupan/)
  })
})
