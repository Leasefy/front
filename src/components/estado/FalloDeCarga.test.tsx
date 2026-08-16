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

  // ── El marco ───────────────────────────────────────────────────────────
  // Nico: «tiene como doble borde, se ve raro». El fallo pintaba su propia
  // tarjeta adentro de la tarjeta de la tabla: dos rectángulos redondeados,
  // uno dentro del otro. Su gemelo <SinDatos> ocupa ese mismo hueco sin marco.

  it('enmarcado (por defecto) pinta su propia tarjeta: es toda la pantalla', () => {
    render(<FalloDeCarga error={new Error('boom')} />)
    const raiz = container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement
    expect(raiz.className).toContain('border')
    expect(raiz.getAttribute('data-enmarcado')).toBe('si')
  })

  it('sin marco no pinta borde ni fondo: va dentro de algo que ya los tiene', () => {
    render(<FalloDeCarga error={new Error('boom')} enmarcado={false} />)
    const raiz = container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement
    expect(raiz.className).not.toContain('border')
    expect(raiz.className).not.toContain('bg-card')
    expect(raiz.getAttribute('data-enmarcado')).toBe('no')
  })

  // ── Que el reintento se vea ────────────────────────────────────────────

  it('mientras reintenta, el botón se muestra ocupado y no se puede repetir', async () => {
    let resolver: () => void = () => {}
    const onReintentar = vi.fn(() => new Promise<void>((r) => { resolver = r }))
    render(<FalloDeCarga error={new ApiError(500, 'boom')} onReintentar={onReintentar} />)

    const boton = container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement
    await act(async () => { boton.click() })

    expect(boton.getAttribute('data-reintentando')).toBe('si')
    expect(boton.disabled).toBe(true)
    expect(boton.textContent).toContain('Intentando')

    // Un segundo clic durante el reintento no dispara otra petición.
    await act(async () => { boton.click() })
    expect(onReintentar).toHaveBeenCalledTimes(1)

    await act(async () => { resolver() })
  })

  it('sin marco queda idéntico a <SinDatos>: el mismo hueco en dos estados', () => {
    // Si las clases de caja se separan, el fallo y el vacío saltan de posición
    // al cambiar de estado dentro de la misma tabla.
    render(<FalloDeCarga error={new Error('boom')} enmarcado={false} />)
    const raiz = container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement
    expect(raiz.className.trim()).toBe('px-6 py-16 text-center')
  })
})
