/**
 * RegistrationProfilesPage — admin toggle screen.
 *
 * Uses createRoot + act (repo convention, no RTL). Mocks the admin method
 * module so the test drives list/toggle behavior without a backend.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const listRegistrationProfiles = vi.fn()
const setRegistrationProfileEnabled = vi.fn()

vi.mock('@/lib/admin/registration-profiles', () => ({
  listRegistrationProfiles: (signal?: AbortSignal) => listRegistrationProfiles(signal),
  setRegistrationProfileEnabled: (key: string, enabled: boolean) =>
    setRegistrationProfileEnabled(key, enabled),
}))

import RegistrationProfilesPage from './page'

const ALL_ON = [
  { key: 'tenant', enabled: true, updated_at: null, updated_by: null },
  { key: 'landlord', enabled: true, updated_at: null, updated_by: null },
  { key: 'agency', enabled: true, updated_at: null, updated_by: null },
]

let container: HTMLDivElement
let root: Root

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(RegistrationProfilesPage))
  })
}

function switches(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('[role="switch"]')) as HTMLButtonElement[]
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  listRegistrationProfiles.mockReset()
  setRegistrationProfileEnabled.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  root?.unmount()
  container.remove()
})

describe('RegistrationProfilesPage', () => {
  it('renders one switch per profile, reflecting the backend enabled state', async () => {
    listRegistrationProfiles.mockResolvedValue([
      { key: 'tenant', enabled: true, updated_at: null, updated_by: null },
      { key: 'landlord', enabled: false, updated_at: null, updated_by: null },
      { key: 'agency', enabled: true, updated_at: null, updated_by: null },
    ])

    await mount()

    const sw = switches()
    expect(sw).toHaveLength(3)
    expect(sw[0].getAttribute('aria-checked')).toBe('true') // tenant
    expect(sw[1].getAttribute('aria-checked')).toBe('false') // landlord
    expect(sw[2].getAttribute('aria-checked')).toBe('true') // agency
  })

  it('disabling a profile PATCHes it off via the admin method', async () => {
    listRegistrationProfiles.mockResolvedValue(ALL_ON)
    setRegistrationProfileEnabled.mockResolvedValue({
      key: 'landlord',
      enabled: false,
      updated_at: '2026-08-02T10:00:00Z',
      updated_by: 'admin@leasefy.co',
    })

    await mount()

    await act(async () => {
      switches()[1].click() // landlord → off
    })

    expect(setRegistrationProfileEnabled).toHaveBeenCalledWith('landlord', false)
  })

  it('refuses to disable the LAST enabled profile (guard) and does not call the backend', async () => {
    listRegistrationProfiles.mockResolvedValue([
      { key: 'tenant', enabled: true, updated_at: null, updated_by: null },
      { key: 'landlord', enabled: false, updated_at: null, updated_by: null },
      { key: 'agency', enabled: false, updated_at: null, updated_by: null },
    ])

    await mount()

    await act(async () => {
      switches()[0].click() // tenant is the only one on → attempt to turn off
    })

    expect(setRegistrationProfileEnabled).not.toHaveBeenCalled()
    expect(container.textContent).toContain('último perfil activo')
  })

  it('shows the "backend pendiente" notice and disables toggles on a 404', async () => {
    const err = Object.assign(new Error('not found'), { name: 'ApiError', status: 404 })
    // Make it a real ApiError instance so the `instanceof` check in the page passes.
    const { ApiError } = await import('@/lib/admin/api')
    listRegistrationProfiles.mockRejectedValue(new ApiError(404, 'not found'))
    void err

    await mount()

    expect(container.textContent).toContain('backend pendiente')
    expect(switches().every((s) => s.disabled)).toBe(true)
  })
})
