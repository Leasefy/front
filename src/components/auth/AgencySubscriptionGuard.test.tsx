/**
 * AgencySubscriptionGuard.test.tsx — UX-only subscription gate for the agency
 * panel. Blocks /panel/inmobiliaria/* unless the agency has an ACTIVE PAID plan
 * (pro/flex). Fail-open on any indeterminate state so a paying user is never
 * bounced on a transient failure. Backend stays the source of truth.
 *
 * Strategy: mock useAgencySubscription, useAuth, and next/navigation
 * (usePathname + useRouter). Assert children mount vs the redirect spinner vs
 * the non-admin blocking screen, and that denial for an admin triggers
 * router.replace('/panel/inmobiliaria/upgrade').
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const replaceMock = vi.fn()
const navMock = { pathname: '/panel/inmobiliaria/dashboard' }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => navMock.pathname,
}))

interface SubscriptionMock {
  currentPlanId: 'starter' | 'pro' | 'flex' | undefined
  isLoading: boolean
  error: Error | null
}
const subscriptionMock: SubscriptionMock = {
  currentPlanId: undefined,
  isLoading: false,
  error: null,
}
vi.mock('@/lib/hooks/useAgencySubscription', () => ({
  useAgencySubscription: () => subscriptionMock,
}))

const authMock: { agencyRole: string | null } = { agencyRole: null }
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authMock,
}))

import { AgencySubscriptionGuard } from './AgencySubscriptionGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
  navMock.pathname = '/panel/inmobiliaria/dashboard'
  subscriptionMock.currentPlanId = undefined
  subscriptionMock.isLoading = false
  subscriptionMock.error = null
  authMock.agencyRole = null
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

function render() {
  act(() => {
    root.render(
      React.createElement(
        AgencySubscriptionGuard,
        null,
        React.createElement('div', { 'data-testid': 'inner' }, 'contenido'),
      ),
    )
  })
}

function innerMounted(): boolean {
  return container.querySelector('[data-testid="inner"]') !== null
}

describe('AgencySubscriptionGuard', () => {
  it('renders children when the agency is on a paid plan (pro)', () => {
    subscriptionMock.currentPlanId = 'pro'
    authMock.agencyRole = AGENCY_ROLES.ADMIN
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders children when the agency is on a paid plan (flex)', () => {
    subscriptionMock.currentPlanId = 'flex'
    authMock.agencyRole = AGENCY_ROLES.CONTADOR
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirects an admin to /upgrade when on a non-paid plan (starter)', () => {
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.ADMIN
    render()
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/upgrade')
    expect(innerMounted()).toBe(false)
  })

  it('shows the blocking screen (no redirect) for a non-admin on a non-paid plan', () => {
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.CONTADOR
    render()
    expect(replaceMock).not.toHaveBeenCalled()
    expect(innerMounted()).toBe(false)
    expect(container.textContent).toContain('Tu agencia no tiene un plan activo')
  })

  it('renders children on an exempt route (upgrade) even for an admin with no paid plan', () => {
    navMock.pathname = '/panel/inmobiliaria/upgrade'
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.ADMIN
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders children on an exempt route (checkout) even for a non-admin with no paid plan', () => {
    navMock.pathname = '/panel/inmobiliaria/checkout/pro'
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.CONTADOR
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('fails open (renders children) while the subscription is loading', () => {
    subscriptionMock.isLoading = true
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.CONTADOR
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('fails open (renders children) when the subscription fetch errored', () => {
    subscriptionMock.error = new Error('boom')
    subscriptionMock.currentPlanId = 'starter'
    authMock.agencyRole = AGENCY_ROLES.ADMIN
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('fails open (renders children) while currentPlanId is undefined', () => {
    subscriptionMock.currentPlanId = undefined
    authMock.agencyRole = AGENCY_ROLES.ADMIN
    render()
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
