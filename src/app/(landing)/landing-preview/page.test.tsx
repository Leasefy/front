/**
 * page.test.tsx — /landing-preview staging shell for the home theatrical
 * scroll. SEO guard: metadata.robots MUST spread `landingRobots()` so this
 * in-progress page never gets indexed while LANDING_STAGE is true (spec:
 * Staging Route Isolation).
 *
 * SLICE 3a wires the first two narrative beats directly here (ShaderHero,
 * EclipseSection) — `<LandingHome>` (T3.6, composing all five beats) lands
 * with S3b once CaseRail/FinanceEquation/ClosingBanner exist; until then
 * this page is the interim composition point.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

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

  it('renders the theatrical scroll shell', () => {
    act(() => {
      root.render(<LandingPreviewPage />)
    })
    expect(container.querySelector('[data-testid="landing-preview-shell"]')).toBeTruthy()
  })

  it('renders ShaderHero followed by EclipseSection, in narrative order (SLICE 3a)', () => {
    act(() => {
      root.render(<LandingPreviewPage />)
    })
    const shell = container.querySelector('[data-testid="landing-preview-shell"]') as HTMLElement
    const sections = Array.from(shell.querySelectorAll('[data-testid="shader-hero"], [data-testid="eclipse-section"]'))
    expect(sections.map((el) => el.getAttribute('data-testid'))).toEqual(['shader-hero', 'eclipse-section'])
  })
})
