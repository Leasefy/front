/**
 * El encabezado del formulario de postulación: la ubicación del inmueble.
 * Visto en el lab (QA del buró, 19-10-2026): un inmueble sin barrio decía
 * «, Sabaneta».
 */
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Property } from '@/lib/types/property'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }))
vi.mock('@/components/property/PortadaDelInmueble', () => ({ PortadaDelInmueble: () => null }))
vi.mock('./WizardNavigation', () => ({ WizardNavigation: () => null }))
vi.mock('@/lib/context/ApplicationContext', () => ({
  useApplication: () => ({
    application: {},
    currentStep: 1,
    totalSteps: 5,
    completedSteps: [],
    goToStep: vi.fn(),
    prevStep: vi.fn(),
    submitApplication: vi.fn(),
    isLoading: false,
    submissionError: null,
    submissionLoginHref: null,
    canSubmit: false,
    currentStepValidation: { isValid: true, errors: {} },
    currentStepMissingFields: [],
    attemptedAdvance: false,
    tryAdvanceStep: vi.fn(),
    mode: 'create',
    showPrefillNotice: false,
    dismissPrefillNotice: vi.fn(),
  }),
}))

import { WizardShell } from './WizardShell'

let host: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

async function montar(lugar: { neighborhood: string | null; city: string | null }) {
  const property = { id: 'p1', title: 'Apartamento en Sabaneta', monthlyRent: 2600000, ...lugar } as unknown as Property
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(
      <WizardShell property={property}>
        <p>paso</p>
      </WizardShell>,
    )
  })
  return host.textContent ?? ''
}

describe('WizardShell: la ubicación del inmueble', () => {
  it('sin barrio dice sólo la ciudad, sin la coma suelta', async () => {
    const t = await montar({ neighborhood: null, city: 'Sabaneta' })
    expect(t).toContain('Sabaneta')
    expect(t).not.toContain(', Sabaneta')
  })

  it('con barrio y ciudad, los dos separados por coma', async () => {
    const t = await montar({ neighborhood: 'Laureles', city: 'Medellín' })
    expect(t).toContain('Laureles, Medellín')
  })
})
