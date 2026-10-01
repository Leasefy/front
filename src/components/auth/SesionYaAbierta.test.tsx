import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: { name: 'Nicolas Garcia', email: 'hola+27@leasefy.co' },
    signOut: vi.fn(async () => {}),
  }),
}))

import { SesionYaAbierta } from './SesionYaAbierta'

let container: HTMLDivElement
let root: Root
let hrefAsignados: string[]

beforeEach(() => {
  hrefAsignados = []
  // La navegación real no existe en happy-dom: se registra a dónde se fue.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      set href(v: string) {
        hrefAsignados.push(v)
      },
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<SesionYaAbierta destino="/panel/inmobiliaria" onCambiarDeCuenta={vi.fn()} />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('<SesionYaAbierta>', () => {
  it('🔴 «Continuar como…» queda cargando y deshabilitado mientras navega (Nico, 30-09)', () => {
    const boton = container.querySelector('[data-testid="sesion-continuar"]') as HTMLButtonElement
    expect(boton.disabled).toBe(false)

    act(() => {
      boton.click()
    })

    expect(hrefAsignados).toEqual(['/panel/inmobiliaria'])
    expect(boton.disabled).toBe(true)

    // Un segundo clic no vuelve a navegar.
    act(() => {
      boton.click()
    })
    expect(hrefAsignados).toHaveLength(1)
  })
})
