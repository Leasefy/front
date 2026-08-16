/**
 * @vitest-environment happy-dom
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError, setAccessToken } from '@/lib/api/client'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild ? React.createElement('span', props, children) : React.createElement('button', props, children),
}))

import { FalloDeCarga } from './FalloDeCarga'

describe('<FalloDeCarga>', () => {
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

  it('sobre un 404 no ofrece reintentar aunque le pasen el callback', () => {
    // Éste es el defecto que motivó el componente: se ofrecía «Intentar de
    // nuevo» sobre algo que no existe. El callback puede venir igual — la
    // decisión es del componente, no de quien lo llama.
    const onReintentar = vi.fn()
    render(
      <FalloDeCarga
        error={new ApiError(404, 'Property with ID abc not found')}
        queEs="esa propiedad"
        onReintentar={onReintentar}
      />,
    )
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')?.getAttribute('data-tipo'))
      .toBe('noExiste')
  })

  it('sobre un fallo de red sí lo ofrece, y lo conecta', () => {
    const onReintentar = vi.fn()
    render(<FalloDeCarga error={new ApiError(0, 'fetch failed')} onReintentar={onReintentar} />)
    const boton = container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement
    expect(boton).not.toBeNull()
    act(() => boton.click())
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it('no muestra el mensaje crudo del backend en pantalla', () => {
    render(<FalloDeCarga error={new ApiError(404, 'Property with ID abc not found')} />)
    const parrafos = Array.from(container.querySelectorAll('p'))
      .map((p) => p.textContent ?? '')
      .join(' ')
    expect(parrafos).not.toContain('Property with ID')
    // pero lo conserva accesible para diagnóstico
    expect(container.querySelector('[data-testid="fallo-detalle-tecnico"]')?.textContent)
      .toContain('Property with ID abc not found')
  })

  it('cuando reintentar no aplica, da una salida', () => {
    render(
      <FalloDeCarga
        error={new ApiError(404, 'x')}
        volverA={{ label: 'Volver a inmuebles', href: '/panel/inmobiliaria/inmuebles' }}
      />,
    )
    const salida = container.querySelector('a[href="/panel/inmobiliaria/inmuebles"]')
    expect(salida?.textContent).toContain('Volver a inmuebles')
  })

  it('se anuncia como alerta para lectores de pantalla', () => {
    render(<FalloDeCarga error={new Error('boom')} />)
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('un 401 SIN sesión manda a entrar de nuevo, a una ruta que existe', () => {
    // `/auth/login` no existe en este repo: el botón caía en el 404. La ruta
    // real es `/auth`, y lleva returnUrl como hace ProtectedRoute.
    setAccessToken(null)
    render(<FalloDeCarga error={new ApiError(401, 'Unauthorized')} onReintentar={vi.fn()} />)
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    const salida = container.querySelector('a[href^="/auth?returnUrl="]')
    expect(salida).not.toBeNull()
    expect(container.querySelector('a[href="/auth/login"]')).toBeNull()
  })

  it('un 401 CON sesión viva ofrece reintentar y no habla de la sesión', () => {
    setAccessToken('token-vivo')
    render(<FalloDeCarga error={new ApiError(401, 'Unauthorized')} onReintentar={vi.fn()} />)
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
    expect(container.textContent).not.toContain('se venció')
    setAccessToken(null)
  })
})
