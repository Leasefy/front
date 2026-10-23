/**
 * Conceptos y liquidación (revisora r25): bajo lg la respuesta quedaba debajo de todo el formulario. Va pegada
 * abajo con lo que paga y lo que recibe, las MISMAS cifras de la liquidación.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { ConceptosYLiquidacion } from './ConceptosYLiquidacion'

let raiz: Root
let caja: HTMLDivElement

beforeEach(() => {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
})

afterEach(() => {
  act(() => raiz.unmount())
  caja.remove()
})

describe('ConceptosYLiquidacion', () => {
  it('la franja pegada dice lo mismo que la liquidación: paga y recibe', async () => {
    await act(async () => {
      raiz.render(<ConceptosYLiquidacion />)
    })
    const pegada = caja.querySelector('[data-testid="liquidacion-pegada"]')!
    expect(pegada).not.toBeNull()
    expect(pegada.className).toContain('lg:hidden')
    const neto = caja.querySelector('[data-testid="neto"]')!.textContent ?? ''
    const cifra = neto.replace(/^\D*/, '')
    expect(pegada.textContent).toContain('Paga')
    expect(pegada.textContent).toContain(cifra.trim())
  })
})
