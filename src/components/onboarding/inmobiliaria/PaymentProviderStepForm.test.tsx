import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { PaymentProviderStepForm } from './PaymentProviderStepForm'

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

function render(props: Partial<React.ComponentProps<typeof PaymentProviderStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof PaymentProviderStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    submitError: null,
    ...props,
  }
  act(() => {
    root.render(<PaymentProviderStepForm {...defaultProps} />)
  })
  return defaultProps
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
    '[data-testid="payment-provider-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PaymentProviderStepForm>', () => {
  it('changes the selected provider via the select', () => {
    render()

    const trigger = container.querySelector('#provider') as HTMLElement
    expect(trigger?.textContent).toContain('Wompi')

    act(() => {
      trigger.click()
    })
    const boldOption = document.querySelector('[data-testid="payment-provider-option-bold"]') as HTMLElement
    act(() => {
      boldOption?.click()
    })

    expect((container.querySelector('#provider') as HTMLElement)?.textContent).toContain('Bold')
  })

  it('shows required errors and blocks submit when apiKey/eventSecret are empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('La API key es obligatoria.')
    expect(container.textContent).toContain('El event secret es obligatorio.')
  })

  it('submits the mapped payload for a valid wompi submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    setInputValue(byId('apiKey'), 'key-123')
    setInputValue(byId('eventSecret'), 'secret-456')
    setInputValue(byId('publicKey'), 'pub-789')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      provider: 'wompi',
      credentials: { apiKey: 'key-123', eventSecret: 'secret-456', publicKey: 'pub-789' },
    })
  })

  it('renders apiKey and eventSecret as password inputs by default', () => {
    render()

    expect(byId('apiKey').type).toBe('password')
    expect(byId('eventSecret').type).toBe('password')
  })
})
