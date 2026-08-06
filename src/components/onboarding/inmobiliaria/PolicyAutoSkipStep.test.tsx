import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { PolicyAutoSkipStep } from './PolicyAutoSkipStep'

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

function render(props: Partial<React.ComponentProps<typeof PolicyAutoSkipStep>> = {}) {
  const defaultProps: React.ComponentProps<typeof PolicyAutoSkipStep> = {
    isSubmitting: false,
    onSkip: vi.fn().mockResolvedValue({ currentStep: 'habeas_data' }),
    ...props,
  }
  act(() => {
    root.render(<PolicyAutoSkipStep {...defaultProps} />)
  })
  return defaultProps
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PolicyAutoSkipStep>', () => {
  it('fires onSkip exactly once on mount, with no user interaction', async () => {
    const onSkip = vi.fn().mockResolvedValue({ currentStep: 'habeas_data' })
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

    expect(container.querySelector('[data-testid="policy-skip-loading"]')).toBeTruthy()
    resolveSkip({ currentStep: 'habeas_data' })
  })

  it('does not fire again while a submit from another action is already in flight', async () => {
    const onSkip = vi.fn().mockResolvedValue({ currentStep: 'habeas_data' })
    render({ onSkip, isSubmitting: true })
    await flush()

    expect(onSkip).not.toHaveBeenCalled()
  })

  it('shows an error with a retry action when the skip fails, and retrying calls onSkip again exactly once (no auto-loop)', async () => {
    const onSkip = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ currentStep: 'habeas_data' })
    render({ onSkip })
    await flush()

    expect(onSkip).toHaveBeenCalledTimes(1)
    const errorBlock = container.querySelector('[data-testid="policy-skip-error"]')
    expect(errorBlock).toBeTruthy()

    const retryBtn = errorBlock?.querySelector('button') as HTMLButtonElement
    await act(async () => {
      retryBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onSkip).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="policy-skip-error"]')).toBeFalsy()

    // No further auto-retries after settling on success.
    await flush()
    expect(onSkip).toHaveBeenCalledTimes(2)
  })
})
