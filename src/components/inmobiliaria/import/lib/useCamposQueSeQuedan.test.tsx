import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useCamposQueSeQuedan } from './useCamposQueSeQuedan'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function Sonda({ faltan }: { faltan: string[] }) {
  const campos = useCamposQueSeQuedan(faltan)
  return <output>{campos.join(',')}</output>
}

function montar(faltan: string[]) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const pintar = (f: string[]) => act(() => root.render(<Sonda faltan={f} />))
  pintar(faltan)
  return { pintar, leer: () => container.querySelector('output')!.textContent }
}

describe('useCamposQueSeQuedan', () => {
  it('lo que faltó alguna vez se queda aunque ya no falte', () => {
    const s = montar(['propertyZone', 'monthlyRent'])
    expect(s.leer()).toBe('propertyZone,monthlyRent')
    s.pintar(['monthlyRent'])
    expect(s.leer()).toBe('propertyZone,monthlyRent')
    s.pintar([])
    expect(s.leer()).toBe('propertyZone,monthlyRent')
  })

  it('un campo que empieza a faltar entra en el mismo render, al final', () => {
    const s = montar(['propertyZone'])
    s.pintar(['propertyZone', 'bathrooms'])
    expect(s.leer()).toBe('propertyZone,bathrooms')
    s.pintar(['bathrooms'])
    expect(s.leer()).toBe('propertyZone,bathrooms')
  })

  it('sin faltantes nunca, no inventa nada', () => {
    const s = montar([])
    expect(s.leer()).toBe('')
  })
})
