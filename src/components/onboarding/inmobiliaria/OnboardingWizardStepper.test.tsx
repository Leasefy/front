import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { OnboardingWizardStepper } from './OnboardingWizardStepper'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function render(props: React.ComponentProps<typeof OnboardingWizardStepper>) {
  act(() => {
    root.render(<OnboardingWizardStepper {...props} />)
  })
}

const link = (key: string) => container.querySelector(`[data-testid="wizard-step-link-${key}"]`) as HTMLButtonElement | null

describe('<OnboardingWizardStepper>', () => {
  it('sin onNavigateToStep es sólo informativo: ningún paso es un botón', () => {
    render({ currentStep: 'habeas_data' })
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.querySelector('[data-testid="wizard-step-habeas_data"]')?.getAttribute('data-active')).toBe('true')
  })

  it('un paso hecho es un botón que devuelve a ese paso; el actual y los que faltan, no', () => {
    const onNavigateToStep = vi.fn()
    render({ currentStep: 'habeas_data', onNavigateToStep })
    expect(link('agency')).toBeTruthy()
    expect(link('members')).toBeTruthy()
    expect(link('habeas_data')).toBeNull() // ya estás ahí
    expect(link('complete')).toBeNull() // no hay a qué volver
    act(() => {
      link('members')!.click()
    })
    expect(onNavigateToStep).toHaveBeenCalledWith('members')
  })

  it('al volver atrás, los pasos hechos de más adelante siguen hechos y se puede ir a ellos', () => {
    const onNavigateToStep = vi.fn()
    // La persona llegó a Confirmar y volvió a Agencia.
    render({ currentStep: 'agency', reachedStep: 'complete', onNavigateToStep })
    expect(container.querySelector('[data-testid="wizard-step-agency"]')?.getAttribute('data-active')).toBe('true')
    expect(link('agency')).toBeNull()
    expect(link('members')).toBeTruthy()
    expect(link('habeas_data')).toBeTruthy()
    expect(link('complete')).toBeTruthy()
    act(() => {
      link('complete')!.click()
    })
    expect(onNavigateToStep).toHaveBeenCalledWith('complete')
  })
})
