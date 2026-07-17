/**
 * ContactForm.test.tsx — the contact route's form (landing-react-port
 * SLICE 7, T7.1), ported from the standalone's `#contactPage` overlay
 * (`landing-standalone/index.html` ~L2741-2771, CSS ~L1477-1518).
 * Structure/wiring only per Strict TDD: copy/channels render, interest
 * chip selection, the required-field guard blocks navigation with no
 * name/email, and a valid submit builds the exact `mailto:` URL (via the
 * unit-tested `buildContactMailto`) and navigates through
 * `window.location.href` — no network call, no PII stored.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { ContactForm } from './ContactForm'
import { buildContactMailto } from '@/lib/landing/contact-mailto'

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

function render() {
  act(() => {
    root.render(<ContactForm />)
  })
}

function setValue(testId: string, value: string) {
  const el = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | HTMLTextAreaElement
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value',
  )!.set!
  act(() => {
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function submit() {
  const form = container.querySelector('[data-testid="contact-form"]') as HTMLFormElement
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('<ContactForm>', () => {
  it('renders the heading, lead, and the three contact channels', () => {
    render()
    expect(container.querySelector('h1')?.textContent).toContain('Hablemos de tu operación')
    expect(container.querySelector('[data-testid="contact-channel-email"]')?.textContent).toContain(
      'hola@leasefy.com',
    )
    expect(container.querySelector('[data-testid="contact-channel-whatsapp"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="contact-channel-base"]')?.textContent).toContain('Medellín')
  })

  it('defaults to the "Todo el sistema" interest chip and allows switching', () => {
    render()
    const chips = Array.from(container.querySelectorAll('[data-testid="contact-chips"] button'))
    const active = chips.find((c) => c.getAttribute('aria-pressed') === 'true')
    expect(active?.textContent).toBe('Todo el sistema')

    const crmChip = chips.find((c) => c.textContent === 'CRM') as HTMLButtonElement
    act(() => {
      crmChip.click()
    })
    expect(crmChip.getAttribute('aria-pressed')).toBe('true')
    expect(active?.getAttribute('aria-pressed')).toBe('false')
  })

  it('required-field guard: blocks navigation and shows an error when name/email are empty', () => {
    const originalLocation = window.location
    const locationStub = { href: '' } as Location
    Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true })

    render()
    submit()

    expect(window.location.href).toBe('')
    expect(container.querySelector('[data-testid="contact-error"]')).toBeTruthy()

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('valid submit builds the exact mailto: URL and navigates via window.location.href', () => {
    const originalLocation = window.location
    const locationStub = { href: '' } as Location
    Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true })

    render()
    setValue('contact-name', 'Ana Pérez')
    setValue('contact-email', 'ana@inmobiliaria.co')
    setValue('contact-agency', 'Inmobiliaria Andes')
    setValue('contact-message', 'Cobranza manual')
    submit()

    const expected = buildContactMailto({
      name: 'Ana Pérez',
      email: 'ana@inmobiliaria.co',
      agency: 'Inmobiliaria Andes',
      interest: 'Todo el sistema',
      message: 'Cobranza manual',
    })
    expect(window.location.href).toBe(expected)
    expect(container.querySelector('[data-testid="contact-error"]')).toBeFalsy()

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })
})
