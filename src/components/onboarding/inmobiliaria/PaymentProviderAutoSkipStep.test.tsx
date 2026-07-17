import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { PaymentProviderAutoSkipStep } from './PaymentProviderAutoSkipStep'

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

function render(props: Partial<React.ComponentProps<typeof PaymentProviderAutoSkipStep>> = {}) {
  const defaultProps: React.ComponentProps<typeof PaymentProviderAutoSkipStep> = {
    isSubmitting: false,
    onSkip: vi.fn().mockResolvedValue({ currentStep: 'policy' }),
    ...props,
  }
  act(() => {
    root.render(<PaymentProviderAutoSkipStep {...defaultProps} />)
  })
  return defaultProps
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PaymentProviderAutoSkipStep>', () => {
  it('fires onSkip exactly once on mount, with no user interaction', async () => {
    const onSkip = vi.fn().mockResolvedValue({ currentStep: 'policy' })
    render({ onSkip })
    await flush()

    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('shows a loading affordance while the skip round-trips', () => {
    let resolveSkip: (value: unknown) => void = () => {}
    const onSkip = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSkip = resolve
        }),
    )
    render({ onSkip })

    expect(container.querySelector('[data-testid="payment-provider-skip-loading"]')).toBeTruthy()
    resolveSkip({ currentStep: 'policy' })
  })

  it('does not fire again while a submit from another action is already in flight', async () => {
    const onSkip = vi.fn().mockResolvedValue({ currentStep: 'policy' })
    render({ onSkip, isSubmitting: true })
    await flush()

    expect(onSkip).not.toHaveBeenCalled()
  })

  it('shows an error with a retry action when the skip fails, and retrying calls onSkip again exactly once (no auto-loop)', async () => {
    const onSkip = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ currentStep: 'policy' })
    render({ onSkip })
    await flush()

    expect(onSkip).toHaveBeenCalledTimes(1)
    const errorBlock = container.querySelector('[data-testid="payment-provider-skip-error"]')
    expect(errorBlock).toBeTruthy()

    const retryBtn = errorBlock?.querySelector('button') as HTMLButtonElement
    await act(async () => {
      retryBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onSkip).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="payment-provider-skip-error"]')).toBeFalsy()

    // No further auto-retries after settling on success.
    await flush()
    expect(onSkip).toHaveBeenCalledTimes(2)
  })
})
