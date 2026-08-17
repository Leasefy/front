/**
 * AvaluoContext.test.tsx — submitAvaluo navigation decision.
 *
 * Payment now happens at intake (WU2): the micro's POST /intake response
 * carries {paymentUrl, paymentProvider}. submitAvaluo must redirect the
 * whole tab to the Wompi hosted checkout when paymentProvider === 'wompi'
 * and a paymentUrl is present; otherwise it falls back to the existing
 * router.push('/avaluo/estado/<id>') behavior (stub / null cases).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
}))

const submitIntakeMock = vi.fn()
const uploadPhotoMock = vi.fn()
const persistCapTokenMock = vi.fn()
vi.mock('@/lib/api/avaluo.service', () => ({
  submitIntake: (...a: unknown[]) => submitIntakeMock(...a),
  uploadPhoto: (...a: unknown[]) => uploadPhotoMock(...a),
  persistCapToken: (...a: unknown[]) => persistCapTokenMock(...a),
}))

import { AvaluoProvider, useAvaluo } from './AvaluoContext'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  pushMock.mockReset()
  submitIntakeMock.mockReset()
  uploadPhotoMock.mockReset().mockResolvedValue('key-1')
  persistCapTokenMock.mockReset()

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

function TestHarness() {
  const { submitAvaluo, submitError, isSubmitting } = useAvaluo()
  return (
    <div>
      <button data-testid="submit-btn" onClick={() => submitAvaluo()}>
        submit
      </button>
      <span data-testid="submit-error">{submitError ?? ''}</span>
      <span data-testid="is-submitting">{String(isSubmitting)}</span>
    </div>
  )
}

async function renderAndSubmit() {
  act(() => {
    root.render(
      <AvaluoProvider>
        <TestHarness />
      </AvaluoProvider>
    )
  })
  const btn = container.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement
  await act(async () => {
    btn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<AvaluoProvider> submitAvaluo — payment-at-intake navigation', () => {
  it('redirects the tab to paymentUrl when paymentProvider is wompi', async () => {
    submitIntakeMock.mockResolvedValue({
      id: 'sub-1',
      token: 'cap-1',
      paymentUrl: 'https://checkout.wompi.co/l/x',
      paymentProvider: 'wompi',
    })

    const originalLocation = window.location
    const locationStub = { href: '' } as Location
    Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true })

    await renderAndSubmit()

    expect(persistCapTokenMock).toHaveBeenCalledWith('sub-1', 'cap-1')
    expect(window.location.href).toBe('https://checkout.wompi.co/l/x')
    expect(pushMock).not.toHaveBeenCalled()

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('navigates to /avaluo/estado/<id> when paymentProvider is stub', async () => {
    submitIntakeMock.mockResolvedValue({
      id: 'sub-2',
      token: 'cap-2',
      paymentUrl: 'https://stub.example.com/pay',
      paymentProvider: 'stub',
    })

    await renderAndSubmit()

    expect(pushMock).toHaveBeenCalledWith('/avaluo/estado/sub-2')
  })

  it('navigates to /avaluo/estado/<id> when paymentProvider/paymentUrl are null', async () => {
    submitIntakeMock.mockResolvedValue({
      id: 'sub-3',
      token: 'cap-3',
      paymentUrl: null,
      paymentProvider: null,
    })

    await renderAndSubmit()

    expect(pushMock).toHaveBeenCalledWith('/avaluo/estado/sub-3')
  })
})
