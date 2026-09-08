import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { TermsStepForm } from './TermsStepForm'

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
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof TermsStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof TermsStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue({ currentStep: 'complete' }),
    submitError: null,
    ...props,
  }
  act(() => {
    root.render(<TermsStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byTestId(testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
  return el as HTMLElement
}

function acceptTerms() {
  const cb = byTestId('terms-accept') as HTMLButtonElement
  if (cb.getAttribute('aria-checked') !== 'true') {
    act(() => {
      cb.click()
    })
  }
}

function submitBtn(): HTMLButtonElement {
  return container.querySelector('[data-testid="terms-step-form"] button[type="submit"]') as HTMLButtonElement
}

async function clickSubmit() {
  await act(async () => {
    submitBtn().click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<TermsStepForm>', () => {
  it('renders only the terms checkbox and a button that opens the terms in a drawer — no new tab, no file/identity fields', async () => {
    render()

    expect(byTestId('terms-accept')).toBeTruthy()
    // Nada de otra pestaña: leer los términos no saca a la persona del
    // asistente (Nico, 2026-09-07). El texto se abre en un cajón.
    expect(container.querySelector('a[href="/terminos"]')).toBeNull()
    const abrir = byTestId('abrir-terminos') as HTMLButtonElement
    expect(abrir.textContent).toContain('términos y condiciones')
    await act(async () => {
      abrir.click()
    })
    expect(document.querySelector('[data-testid="terminos-en-cajon"]')).toBeTruthy()
    // Abrir el cajón no marca la casilla (el botón vive dentro del label).
    expect((byTestId('terms-accept') as HTMLElement).getAttribute('aria-checked')).not.toBe('true')

    // The old habeas-data upload fields must be gone from this step.
    expect(container.querySelector('[data-testid="habeas-data-file-input"]')).toBeFalsy()
    expect(container.querySelector('[id="signedByFullName"]')).toBeFalsy()
    expect(container.querySelector('[id="signedByCedula"]')).toBeFalsy()
  })

  it('keeps the submit disabled until the terms checkbox is accepted', () => {
    render()

    expect(submitBtn().disabled).toBe(true)
    acceptTerms()
    expect(submitBtn().disabled).toBe(false)
  })

  it('does not call onSubmit while the terms are unaccepted', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ currentStep: 'complete' })
    render({ onSubmit })

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit once the terms are accepted and the form is submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ currentStep: 'complete' })
    render({ onSubmit })

    acceptTerms()
    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('renders the session-level submitError banner', () => {
    render({ submitError: 'No pudimos registrar tu aceptación.' })

    expect(byTestId('terms-step-form-error').textContent).toContain('No pudimos registrar tu aceptación.')
  })
})
