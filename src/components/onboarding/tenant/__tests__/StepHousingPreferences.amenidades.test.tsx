/**
 * «Otra amenidad» (Nico, 2026-09-15): además de las ocho de la lista, el
 * inquilino puede escribir las que le importan y no están.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { updateDraft, estado } = vi.hoisted(() => ({
  updateDraft: vi.fn(),
  estado: { draft: {} as Record<string, unknown> },
}))

vi.mock('@/lib/context/TenantOnboardingContext', () => ({
  useTenantOnboarding: () => ({ draft: estado.draft, updateDraft }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { StepHousingPreferences } from '../StepHousingPreferences'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  estado.draft = { preferredZones: [], preferredAmenities: ['parking'], moveInDate: '', hasPets: false }
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => root.render(<StepHousingPreferences />))
}

const botonOtra = () => container.querySelector<HTMLButtonElement>('[data-testid="otra-amenidad"]')!
const campo = () => container.querySelector<HTMLInputElement>('#otraAmenidad')

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function agregar() {
  const boton = [...container.querySelectorAll('button')].filter((b) => b.textContent === 'Agregar').pop()!
  act(() => boton.click())
}

describe('StepHousingPreferences — otra amenidad', () => {
  it('«Otra amenidad» abre un campo para escribirla', () => {
    render()
    expect(campo()).toBeNull()
    act(() => botonOtra().click())
    expect(botonOtra().getAttribute('aria-expanded')).toBe('true')
    expect(campo()).not.toBeNull()
  })

  it('lo que escribe se agrega a las amenidades, sin espacios de sobra', () => {
    render()
    act(() => botonOtra().click())
    escribir(campo()!, '  Ascensor   con  llave ')
    agregar()
    expect(updateDraft).toHaveBeenCalledWith({ preferredAmenities: ['parking', 'Ascensor con llave'] })
  })

  it('si escribe una de la lista, marca esa tarjeta en vez de duplicarla', () => {
    render()
    act(() => botonOtra().click())
    escribir(campo()!, 'piscina')
    agregar()
    expect(updateDraft).toHaveBeenCalledWith({ preferredAmenities: ['parking', 'pool'] })
  })

  it('no repite una que ya agregó, aunque cambie mayúsculas', () => {
    estado.draft = { ...estado.draft, preferredAmenities: ['parking', 'Terraza'] }
    render()
    escribir(campo()!, 'TERRAZA')
    agregar()
    expect(updateDraft).not.toHaveBeenCalled()
  })

  it('las propias se ven como etiquetas que se pueden quitar, y el campo arranca abierto', () => {
    estado.draft = { ...estado.draft, preferredAmenities: ['parking', 'Terraza'] }
    render()
    const propias = container.querySelector('[data-testid="amenidades-propias"]')
    expect(propias?.textContent).toContain('Terraza')
    expect(propias?.textContent).not.toContain('parking')
    expect(campo()).not.toBeNull()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Quitar Terraza"]')!.click())
    expect(updateDraft).toHaveBeenCalledWith({ preferredAmenities: ['parking'] })
  })
})
