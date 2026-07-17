/**
 * TenantProfileContext — no-mock behavior.
 *
 * The demo-era MOCK_TENANT_PROFILE fallback was removed: with no stored
 * applications (and on extraction errors) the context must expose a null
 * profile so consumers render their real empty states, never a fabricated
 * "verified" profile.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import {
  TenantProfileProvider,
  useTenantProfile,
  type TenantProfileContextValue,
} from './TenantProfileContext'

void React // jsx-preserve

let container: HTMLDivElement
let root: Root
let captured: TenantProfileContextValue | null = null

function Probe() {
  captured = useTenantProfile()
  return null
}

async function renderProvider() {
  await act(async () => {
    root.render(
      <TenantProfileProvider>
        <Probe />
      </TenantProfileProvider>,
    )
  })
}

describe('TenantProfileContext', () => {
  beforeEach(() => {
    localStorage.clear()
    captured = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('exposes a null profile when no applications exist (no mock fallback)', async () => {
    await renderProvider()

    expect(captured).not.toBeNull()
    expect(captured!.isLoading).toBe(false)
    expect(captured!.profile).toBeNull()
    expect(captured!.hasVerifiedProfile).toBe(false)
    expect(captured!.hasArriendoPass).toBe(false)
  })

  it('exposes a null profile when stored application data is corrupt', async () => {
    localStorage.setItem('arriendo-facil-application-x', '{not valid json')

    await renderProvider()

    expect(captured!.isLoading).toBe(false)
    expect(captured!.profile).toBeNull()
    expect(captured!.hasVerifiedProfile).toBe(false)
  })
})
