import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { MedidorDeContrasena } from './MedidorDeContrasena'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(contrasena: string, correo?: string) {
  act(() => {
    root.render(<MedidorDeContrasena contrasena={contrasena} correo={correo} />)
  })
}

function encendidas(): number {
  return container.querySelectorAll('[data-testid="medidor-barra"][data-encendida="si"]').length
}

describe('<MedidorDeContrasena>', () => {
  it('sin contraseña: cinco barras apagadas y el consejo de qué se espera', () => {
    render('')
    expect(container.querySelectorAll('[data-testid="medidor-barra"]')).toHaveLength(5)
    expect(encendidas()).toBe(0)
    expect(container.querySelector('[data-testid="medidor-consejo"]')?.textContent).toContain('Mínimo 8 caracteres')
    expect(container.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('0')
  })

  it('débil: dos barras rojas y la palabra', () => {
    render('casaazul9')
    expect(encendidas()).toBe(2)
    const barra = container.querySelector('[data-testid="medidor-barra"][data-encendida="si"]')
    expect(barra?.className).toContain('bg-danger')
    expect(container.querySelector('[data-testid="medidor-de-contrasena"]')?.getAttribute('data-nivel')).toBe('debil')
    expect(container.textContent).toContain('Débil')
  })

  it('aceptable: tres barras naranjas', () => {
    render('Casaazul9')
    expect(encendidas()).toBe(3)
    expect(container.querySelector('[data-testid="medidor-barra"][data-encendida="si"]')?.className).toContain('bg-warning')
    expect(container.textContent).toContain('Aceptable')
  })

  it('muy segura: cinco barras verdes y sin consejo', () => {
    render('Casa#Azul-2026')
    expect(encendidas()).toBe(5)
    expect(container.querySelector('[data-testid="medidor-barra"]')?.className).toContain('bg-success')
    expect(container.querySelector('[data-testid="medidor-consejo"]')).toBeNull()
    expect(container.querySelector('[role="meter"]')?.getAttribute('aria-valuetext')).toBe('Muy segura')
  })

  it('descuenta cuando la contraseña trae el correo', () => {
    render('Nicolas#2026', 'nicolas@gmail.com')
    expect(container.querySelector('[data-testid="medidor-consejo"]')?.textContent).toContain('correo')
  })
})
