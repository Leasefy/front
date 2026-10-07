/**
 * @vitest-environment happy-dom
 *
 * 02-10-2026 · Sin respuesta no hay referencia.
 *
 * Ante un fallo de red el cartel mostraba «Referencia: 0-1432» —el status 0
 * y la hora—, un número que no está en ningún log porque el pedido nunca
 * llegó al servidor. Lo mismo un corte por tiempo («TAR-1432»).
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'
import { reiniciarEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild ? React.createElement('span', props, children) : React.createElement('button', props, children),
}))

import { FalloDeCarga } from './FalloDeCarga'

describe('<FalloDeCarga> — la referencia', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    // La franja global sana: así el cartel no cambia a «Esperando la conexión…».
    reiniciarEstadoDeConexion()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))
  const texto = () => container.textContent ?? ''

  it('🔴 un fallo de red (status 0) no muestra «Referencia: 0-…»', () => {
    render(<FalloDeCarga error={new ApiError(0, 'Failed to fetch')} onReintentar={() => {}} />)
    expect(container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-tipo')).toBe('red')
    expect(texto()).not.toMatch(/Referencia/)
    expect(texto()).not.toMatch(/\b0-\d{4}\b/)
  })

  it('el TypeError crudo del fetch tampoco (navegador y Node)', () => {
    render(<FalloDeCarga error={new TypeError('fetch failed')} />)
    expect(texto()).not.toMatch(/Referencia/)
  })

  it('un corte por tiempo tampoco: no hubo respuesta', () => {
    const corte = new Error('The operation timed out.')
    corte.name = 'TimeoutError'
    render(<FalloDeCarga error={corte} />)
    expect(container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-tipo')).toBe('tardo')
    expect(texto()).not.toMatch(/Referencia/)
  })

  it('un 5xx SÍ la muestra: la del back, que está en su log', () => {
    render(
      <FalloDeCarga
        error={new ApiError(500, 'boom', 'ERROR_INTERNO', { statusCode: 500, referencia: 'ab12cd34' })}
      />,
    )
    expect(texto()).toContain('Referencia: ab12cd34')
  })

  it('un 5xx sin referencia del back sigue con la suya (status + hora)', () => {
    render(<FalloDeCarga error={new ApiError(500, 'boom')} />)
    expect(texto()).toMatch(/Referencia: 500-\d{4}/)
  })
})
