/**
 * page.test.tsx — Home (`/`), F1 final integration (landing-react-port).
 * Structure/wiring only: `landing-fx.ts` (the imperative FX engine) is
 * mocked out, matching this project's existing convention of leaving
 * WebGL/animation internals untested.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const initLandingFxMock = vi.fn(() => () => {})
vi.mock('@/components/landing-v2/landing-fx', () => ({
  initLandingFx: () => initLandingFxMock(),
}))

// LandingHome now renders <LandingAuthCta>, which calls useAuth() — mock it
// out here since this test renders HomePage without the real AuthProvider.
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}))

import HomePage, { metadata } from './page'
import { landingRobots } from '@/lib/landing/landing-stage'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  initLandingFxMock.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('/ (home) page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('renders the v2 home inside the .lv2 scope', () => {
    act(() => {
      root.render(<HomePage />)
    })
    const shell = container.querySelector('[data-testid="lv2-home"]')
    expect(shell).toBeTruthy()
    expect(shell?.className).toContain('lv2')
  })

  it('renders LogoDefs alongside LandingHome so #lfLogo <use> refs resolve', () => {
    act(() => {
      root.render(<HomePage />)
    })
    const shell = container.querySelector('[data-testid="lv2-home"]') as HTMLElement
    expect(shell.querySelector('#lfLogo')).toBeTruthy()
    expect(shell.querySelector('#hdr')).toBeTruthy()
  })

  it('renders #lfLogo exactly once (no duplicate id from LandingHome + LogoDefs)', () => {
    act(() => {
      root.render(<HomePage />)
    })
    expect(container.querySelectorAll('#lfLogo').length).toBe(1)
  })

  it('renders exactly one <header> (no double header from the shared LandingHeader)', () => {
    act(() => {
      root.render(<HomePage />)
    })
    expect(container.querySelectorAll('header').length).toBe(1)
  })

  it('mounts the FX engine on effect and cleans it up on unmount', () => {
    const cleanup = vi.fn()
    initLandingFxMock.mockReturnValue(cleanup)
    act(() => {
      root.render(<HomePage />)
    })
    expect(initLandingFxMock).toHaveBeenCalledTimes(1)
    act(() => {
      root.unmount()
    })
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
