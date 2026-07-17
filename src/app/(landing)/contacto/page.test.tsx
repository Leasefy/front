/**
 * page.test.tsx — /contacto thin route shell (landing-react-port SLICE 7,
 * T7.1). Structure/wiring only per Strict TDD: metadata carries
 * `landingRobots()` (noindex while LANDING_STAGE is true), and the page
 * renders the `<ContactForm>` component.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import ContactPage, { metadata } from './page'
import { landingRobots } from '@/lib/landing/landing-stage'

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

describe('/contacto page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('carries a title and description', () => {
    expect(metadata.title).toBeTruthy()
    expect(metadata.description).toBeTruthy()
  })

  it('renders the ContactForm component', () => {
    act(() => {
      root.render(<ContactPage />)
    })
    expect(container.querySelector('[data-testid="contact-page"]')).toBeTruthy()
  })
})
