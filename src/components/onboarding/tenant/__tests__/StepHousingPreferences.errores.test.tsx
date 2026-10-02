/**
 * 02-10-2026 · Lo que el back rechazó al guardar sale DEBAJO de su campo, y el
 * de los datos del cliente sólo al intentar continuar (nunca desde que se abre).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { updateDraft, estado } = vi.hoisted(() => ({
  updateDraft: vi.fn(),
  estado: {
    draft: {} as Record<string, unknown>,
    erroresDelServidor: {} as Record<string, string>,
  },
}))

vi.mock('@/lib/context/TenantOnboardingContext', () => ({
  useTenantOnboarding: () => ({
    draft: estado.draft,
    updateDraft,
    erroresDelServidor: estado.erroresDelServidor,
  }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { StepHousingPreferences } from '../StepHousingPreferences'
import { IntentoDeAvanzarContext } from '../intento-de-avanzar'

const TOPE = 'El presupuesto no puede pasar de $2.000.000.000 al mes. Revisa que no sobren ceros.'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  estado.draft = { budgetMin: 1_000_000, budgetMax: 30_000_000_000, preferredZones: [], preferredAmenities: [], moveInDate: '', hasPets: false }
  estado.erroresDelServidor = {}
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render(intentos = 0) {
  act(() =>
    root.render(
      <IntentoDeAvanzarContext.Provider value={intentos}>
        <StepHousingPreferences />
      </IntentoDeAvanzarContext.Provider>,
    ),
  )
}

const error = () => container.querySelector('#presupuesto-error')
const minimo = () => container.querySelector<HTMLInputElement>('#budgetMin')!
const maximo = () => container.querySelector<HTMLInputElement>('#budgetMax')!

describe('StepHousingPreferences — errores en su campo', () => {
  it('al abrir el paso no hay error, aunque el dato esté mal', () => {
    render(0)
    expect(error()).toBeNull()
  })

  it('🔴 al intentar continuar, el tope sale bajo el presupuesto y sólo el máximo queda en rojo', () => {
    render(1)
    expect(error()?.textContent).toBe(TOPE)
    expect(maximo().getAttribute('aria-invalid')).toBe('true')
    expect(minimo().getAttribute('aria-invalid')).toBeNull()
  })

  it('🔴 lo que rechazó el servidor sale sin esperar un intento, y el campo recibe el foco', () => {
    estado.draft = { ...estado.draft, budgetMax: 2_000_000 }
    estado.erroresDelServidor = { budgetMax: TOPE }
    render(0)
    expect(error()?.textContent).toBe(TOPE)
    expect(maximo().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(maximo())
  })

  it('el error del servidor en la fecha sale bajo la fecha', () => {
    estado.draft = { ...estado.draft, budgetMax: 2_000_000 }
    estado.erroresDelServidor = { moveInDate: 'Elige una fecha de mudanza válida.' }
    render(0)
    expect(container.querySelector('#mudanza-error')?.textContent).toBe('Elige una fecha de mudanza válida.')
  })

  it('con 10 ciudades o zonas no se puede agregar otra', () => {
    estado.draft = { ...estado.draft, budgetMax: 2_000_000, preferredZones: Array.from({ length: 10 }, (_, i) => `Zona ${i}`) }
    render(0)
    const agregar = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Agregar')!
    expect(agregar.disabled).toBe(true)
  })
})
