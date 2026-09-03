/**
 * La pregunta que abre «Nueva consignación»: nuevo o existente. Y no ofrece
 * «uno que ya tengo» cuando no hay ninguno sin propietario.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
  }),
}))

import { OrigenDelInmueble } from './OrigenDelInmueble'

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(props: Partial<React.ComponentProps<typeof OrigenDelInmueble>> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onNuevo = vi.fn()
  const onExistente = vi.fn()
  act(() => {
    root.render(
      <OrigenDelInmueble disponibles={5} onNuevo={onNuevo} onExistente={onExistente} {...props} />,
    )
  })
  return { onNuevo, onExistente }
}

const nuevo = () => container.querySelector<HTMLButtonElement>('[data-testid="origen-nuevo"]')!
const existente = () => container.querySelector<HTMLButtonElement>('[data-testid="origen-existente"]')!

describe('<OrigenDelInmueble>', () => {
  it('ofrece los dos caminos y avisa cuántos hay sin propietario', () => {
    const { onNuevo, onExistente } = montar()
    expect(existente().textContent).toContain('5')
    expect(existente().disabled).toBe(false)
    act(() => nuevo().click())
    act(() => existente().click())
    expect(onNuevo).toHaveBeenCalledTimes(1)
    expect(onExistente).toHaveBeenCalledTimes(1)
  })

  it('sin inmuebles sin propietario, «uno que ya tengo» no se puede elegir', () => {
    const { onExistente } = montar({ disponibles: 0 })
    expect(existente().disabled).toBe(true)
    expect(existente().textContent).toContain('ninguno')
    act(() => existente().click())
    expect(onExistente).not.toHaveBeenCalled()
  })

  it('mientras cuenta no dice «ninguno» ni bloquea por un dato que no llegó', () => {
    montar({ disponibles: 0, cargando: true })
    expect(existente().disabled).toBe(false)
    expect(existente().textContent).toContain('contando')
  })

  it('«un inmueble nuevo» siempre se puede', () => {
    montar({ disponibles: 0 })
    expect(nuevo().disabled).toBe(false)
  })
})
