/**
 * use-enabled-profiles.test.ts — fail-open read hook for signup surfaces.
 *
 * The critical invariant: signup must NEVER lock users out. If the backend
 * config errors, is unreachable, or returns an empty set, the hook falls OPEN
 * (all three profiles enabled). Only a valid non-empty response narrows it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { useEnabledProfiles } from './use-enabled-profiles'
import * as service from '@/lib/api/registration-profiles.service'

void React

type HookResult = ReturnType<typeof useEnabledProfiles>

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = useEnabledProfiles()
  return null
}

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(TestWrapper))
  })
}

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
})

afterEach(() => {
  vi.restoreAllMocks()
  root?.unmount()
  container.remove()
})

describe('useEnabledProfiles', () => {
  it('narrows to the backend set when it returns a valid non-empty list', async () => {
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockResolvedValue(['tenant', 'agency'])

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.isEnabled('tenant')).toBe(true)
    expect(result?.isEnabled('agency')).toBe(true)
    expect(result?.isEnabled('landlord')).toBe(false)
  })

  it('fails OPEN (all enabled) when the fetch rejects', async () => {
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockRejectedValue(new Error('backend down'))

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.isEnabled('tenant')).toBe(true)
    expect(result?.isEnabled('landlord')).toBe(true)
    expect(result?.isEnabled('agency')).toBe(true)
  })

  it('fails OPEN (all enabled) when the backend returns an empty set', async () => {
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockResolvedValue([])

    await mount()

    expect(result?.isEnabled('tenant')).toBe(true)
    expect(result?.isEnabled('landlord')).toBe(true)
    expect(result?.isEnabled('agency')).toBe(true)
  })

  it('sin caché, mientras carga, avisa que el conjunto es provisional', async () => {
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockReturnValue(new Promise(() => {}))

    await mount()

    expect(result?.isLoading).toBe(true)
    expect(result?.esProvisional).toBe(true)
    expect(result?.isEnabled('landlord')).toBe(true)
  })

  it('guarda la respuesta del back y la próxima carga arranca con ella, sin pasar por «todos»', async () => {
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockResolvedValue(['tenant', 'agency'])
    await mount()
    expect(result?.isEnabled('landlord')).toBe(false)
    expect(JSON.parse(localStorage.getItem('leasefy-perfiles-de-registro') ?? '[]')).toEqual(['tenant', 'agency'])

    // Segunda visita: el back todavía no respondió y aun así «Propietario» no está.
    root.unmount()
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockReturnValue(new Promise(() => {}))
    await mount()

    expect(result?.isLoading).toBe(true)
    expect(result?.esProvisional).toBe(false)
    expect(result?.isEnabled('landlord')).toBe(false)
    expect(result?.isEnabled('tenant')).toBe(true)
    expect(result?.isEnabled('agency')).toBe(true)
  })

  it('con caché y el back caído se queda con la caché, no vuelve a «todos»', async () => {
    localStorage.setItem('leasefy-perfiles-de-registro', JSON.stringify(['tenant', 'agency']))
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockRejectedValue(new Error('backend down'))

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.isEnabled('landlord')).toBe(false)
    expect(result?.isEnabled('tenant')).toBe(true)
  })

  it('una caché rota o con claves inventadas se ignora', async () => {
    localStorage.setItem('leasefy-perfiles-de-registro', '{"no":"es una lista"}')
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockReturnValue(new Promise(() => {}))
    await mount()
    expect(result?.esProvisional).toBe(true)

    root.unmount()
    localStorage.setItem('leasefy-perfiles-de-registro', JSON.stringify(['superadmin']))
    await mount()
    expect(result?.esProvisional).toBe(true)
    expect(result?.isEnabled('landlord')).toBe(true)
  })

  it('starts open while loading (before the fetch resolves)', async () => {
    let resolveFetch: (v: ('tenant' | 'landlord' | 'agency')[]) => void = () => {}
    vi.spyOn(service, 'fetchEnabledRegistrationProfiles').mockReturnValue(
      new Promise((res) => {
        resolveFetch = res
      }),
    )

    await act(async () => {
      root = createRoot(container)
      root.render(React.createElement(TestWrapper))
    })

    // While the promise is pending, every profile stays visible.
    expect(result?.isEnabled('landlord')).toBe(true)

    await act(async () => {
      resolveFetch(['tenant'])
    })

    expect(result?.isEnabled('landlord')).toBe(false)
    expect(result?.isEnabled('tenant')).toBe(true)
  })
})
