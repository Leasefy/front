/**
 * «¿Cuándo planeas mudarte?» (Nico, 2026-09-15): el calendario de cadence en
 * vez del nativo del navegador, y una opción «Aún no lo sé» — antes el campo
 * sólo ofrecía el calendario aunque la fecha nunca fue obligatoria.
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
  estado.draft = { preferredZones: [], preferredAmenities: [], moveInDate: '', hasPets: false }
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => root.render(<StepHousingPreferences />))
}

describe('StepHousingPreferences — fecha de mudanza', () => {
  it('usa el calendario de cadence, no el <input type="date"> del navegador', () => {
    render()
    expect(container.querySelector('input[type="date"]')).toBeNull()
    const trigger = container.querySelector<HTMLButtonElement>('button#moveInDate')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger?.textContent).toContain('Elige una fecha')
  })

  it('«Aún no lo sé» borra la fecha y queda marcado', () => {
    estado.draft = { ...estado.draft, moveInDate: '2026-10-01' }
    render()
    const noSe = container.querySelector<HTMLButtonElement>('[data-testid="mudanza-sin-fecha"]')!
    expect(noSe.textContent).toBe('Aún no lo sé')
    expect(noSe.getAttribute('aria-pressed')).toBe('false')

    act(() => noSe.click())
    expect(updateDraft).toHaveBeenCalledWith({ moveInDate: '', moveInDateUnknown: true })
  })

  it('al volver al paso con «Aún no lo sé» elegido, sigue marcado', () => {
    estado.draft = { ...estado.draft, moveInDateUnknown: true }
    render()
    expect(
      container.querySelector('[data-testid="mudanza-sin-fecha"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('una fecha guardada se muestra en el calendario sin correrse un día por la zona horaria', () => {
    estado.draft = { ...estado.draft, moveInDate: '2026-10-01' }
    render()
    const trigger = container.querySelector<HTMLButtonElement>('button#moveInDate')!
    expect(trigger.getAttribute('aria-label')).toMatch(/1/)
    expect(trigger.getAttribute('aria-label')).not.toMatch(/30/)
  })
})
