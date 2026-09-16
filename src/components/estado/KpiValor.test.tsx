/**
 * @vitest-environment happy-dom
 *
 * Un tile de resumen no puede decir «0» cuando en realidad no sabe. Con el
 * back caído, la tabla de abajo decía «no se pudo cargar» y los tiles de
 * arriba «0 visitas · $0». Este es el valor que va adentro del tile.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'

import { KpiValor } from './KpiValor'

describe('<KpiValor>', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))
  const valor = () => container.querySelector('[data-testid="kpi-valor"]') as HTMLElement

  it('mientras carga no pinta ningún número: ni «0» ni el valor', () => {
    render(<KpiValor cargando>{0}</KpiValor>)
    expect(valor().getAttribute('data-estado')).toBe('cargando')
    expect(container.textContent).not.toContain('0')
  })

  it('si falló dice «—» y explica que no se pudo traer, sin afirmar un cero', () => {
    render(<KpiValor cargando={false} fallo={new ApiError(500, 'boom')}>{0}</KpiValor>)
    expect(valor().getAttribute('data-estado')).toBe('fallo')
    expect(container.textContent).toContain('—')
    expect(container.textContent).toContain('No se pudo traer')
    expect(valor().textContent).not.toMatch(/\b0\b/)
  })

  it('el orden es cargando → falló → valor', () => {
    render(<KpiValor cargando fallo={new ApiError(500, 'boom')}>{7}</KpiValor>)
    expect(valor().getAttribute('data-estado')).toBe('cargando')
  })

  it('con datos pinta el valor tal cual, incluido un cero real', () => {
    render(<KpiValor cargando={false}>{0}</KpiValor>)
    expect(valor().getAttribute('data-estado')).toBe('ok')
    expect(valor().textContent).toBe('0')
  })
})
