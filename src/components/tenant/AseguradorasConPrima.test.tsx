/**
 * Protege las reglas de la lista de aseguradoras del pre-scoring (Slice 2):
 *  · las que respaldan (`viable: true`) van primero
 *  · la prima mensual solo se muestra cuando viene; nunca se inventa
 *  · `motivoRechazo` se muestra en las no viables
 *  · el badge "Demo" aparece SOLO en la aseguradora con `stubMode: true`
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { AseguradorasConPrima } from './AseguradorasConPrima'
import type { PreScoringCarrier } from '@/lib/api/prescoring.types'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function render(carriers: PreScoringCarrier[]) {
  act(() => {
    root.render(<AseguradorasConPrima carriers={carriers} />)
  })
}

function texto(): string {
  return container.textContent ?? ''
}

const FIANLY: PreScoringCarrier = {
  name: 'Fianly',
  productType: 'afianzamiento',
  viable: true,
  primaMensualCop: 45000,
  stubMode: false,
  motivoRechazo: null,
}

const SURA_RECHAZADA: PreScoringCarrier = {
  name: 'Sura',
  productType: 'afianzamiento',
  viable: false,
  primaMensualCop: null,
  stubMode: false,
  motivoRechazo: 'Score de buró insuficiente',
}

describe('<AseguradorasConPrima>', () => {
  it('sin aseguradoras no renderiza nada', () => {
    render([])
    expect(container.querySelector('[data-testid="aseguradoras-prima"]')).toBeNull()
  })

  it('muestra la prima mensual de la que respalda', () => {
    render([FIANLY])
    expect(texto()).toContain('Fianly')
    expect(texto()).toMatch(/45\.000/)
  })

  it('la no viable muestra el motivo, no una prima', () => {
    render([SURA_RECHAZADA])
    const t = texto()
    expect(t).toContain('Score de buró insuficiente')
    expect(t).not.toMatch(/\$\s*0/)
  })

  it('sin motivo ni prima no inventa ninguno de los dos', () => {
    render([{ ...SURA_RECHAZADA, motivoRechazo: null }])
    expect(texto()).not.toMatch(/\$\s*0/)
  })

  it('las que respaldan van primero', () => {
    render([SURA_RECHAZADA, FIANLY])
    const nombres = Array.from(container.querySelectorAll('[data-testid^="carrier-"]')).map(
      (el) => el.getAttribute('data-testid'),
    )
    expect(nombres[0]).toBe('carrier-fianly')
  })

  it('el badge Demo aparece solo en la aseguradora con stubMode', () => {
    render([FIANLY, { ...SURA_RECHAZADA, viable: true, primaMensualCop: 30000, stubMode: true }])
    const demos = container.querySelectorAll('[data-testid="badge-demo"]')
    expect(demos.length).toBe(1)
  })

  it('sin ninguna en demo, no aparece el badge', () => {
    render([FIANLY])
    expect(container.querySelector('[data-testid="badge-demo"]')).toBeNull()
  })
})
