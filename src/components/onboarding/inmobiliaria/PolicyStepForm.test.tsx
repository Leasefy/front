import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { PolicyStepForm } from './PolicyStepForm'

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

function render(props: Partial<React.ComponentProps<typeof PolicyStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof PolicyStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    submitError: null,
    ...props,
  }
  act(() => {
    root.render(<PolicyStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byTestId(testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
  return el as HTMLElement
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`[id="${id}"]`)
  if (!el) throw new Error(`Element with id="${id}" not found`)
  return el as HTMLInputElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clickSubmit() {
  const submitBtn = container.querySelector(
    '[data-testid="policy-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PolicyStepForm>', () => {
  it('(a) starts with the agent defaults visible: plans [3, 6, 12] checked, negotiationMaxAttempts = 3', () => {
    render()

    expect(byTestId('policy-plan-3').getAttribute('aria-checked')).toBe('true')
    expect(byTestId('policy-plan-6').getAttribute('aria-checked')).toBe('true')
    expect(byTestId('policy-plan-12').getAttribute('aria-checked')).toBe('true')
    expect(byTestId('policy-plan-9').getAttribute('aria-checked')).toBe('false')
    expect(byTestId('policy-plan-18').getAttribute('aria-checked')).toBe('false')
    expect(byTestId('policy-plan-24').getAttribute('aria-checked')).toBe('false')

    expect(byId('negotiationMaxAttempts').value).toBe('3')
  })

  it('(b) continuing without changes submits the defaults', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      allowedPaymentPlans: [3, 6, 12],
      negotiationMaxAttempts: 3,
    })
  })

  it('(c) shows a validation error and blocks submit when negotiationMaxAttempts is 0 or negative', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    setInputValue(byId('negotiationMaxAttempts'), '0')
    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('El número de intentos debe ser mayor a 0.')

    setInputValue(byId('negotiationMaxAttempts'), '-1')
    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('El número de intentos debe ser mayor a 0.')
  })

  it('(d) editing the selected plans submits the updated array', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    // Uncheck 6, check 9 — plans go from [3, 6, 12] to [3, 9, 12].
    act(() => {
      byTestId('policy-plan-6').click()
    })
    act(() => {
      byTestId('policy-plan-9').click()
    })

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      allowedPaymentPlans: [3, 9, 12],
      negotiationMaxAttempts: 3,
    })
  })

  it('blocks submit when every plan is unchecked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    act(() => {
      byTestId('policy-plan-3').click()
    })
    act(() => {
      byTestId('policy-plan-6').click()
    })
    act(() => {
      byTestId('policy-plan-12').click()
    })

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Selecciona al menos un plan de pago.')
  })
})
