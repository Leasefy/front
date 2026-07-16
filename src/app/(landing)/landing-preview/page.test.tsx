/**
 * page.test.tsx — /landing-preview staging shell for the home theatrical
 * scroll (SLICE 3 fills the body). SEO guard: metadata.robots MUST spread
 * `landingRobots()` so this in-progress page never gets indexed while
 * LANDING_STAGE is true (spec: Staging Route Isolation).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import LandingPreviewPage, { metadata } from './page'
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

describe('/landing-preview page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('renders a placeholder shell', () => {
    act(() => {
      root.render(<LandingPreviewPage />)
    })
    expect(container.querySelector('[data-testid="landing-preview-shell"]')).toBeTruthy()
  })
})
