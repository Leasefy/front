/**
 * TenantProfileContext — no-mock behavior.
 *
 * The demo-era MOCK_TENANT_PROFILE fallback was removed: with no stored
 * applications (and on extraction errors) the context must expose a null
 * profile so consumers render their real empty states, never a fabricated
 * "verified" profile.
 *
 * The context ALSO no longer builds a profile out of localStorage
 * applications: that data was never verified by anyone, yet it was shown
 * to the tenant as a "verified profile" (Score A, income, contract type).
 * Until there's a real backend endpoint for tenant profile/score, the
 * context must always expose `profile: null`.
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

  it('does not fabricate a profile from a submitted application in localStorage', async () => {
    localStorage.setItem(
      'arriendo-facil-application-1',
      JSON.stringify({
        status: 'submitted',
        updatedAt: new Date().toISOString(),
        personal: { fullName: 'Juan Perez', email: 'juan@example.com', phone: '3000000000' },
        income: {
          monthlySalary: 5000000,
          totalMonthlyIncome: 5000000,
          monthlyObligations: 500000,
          availableForRent: 1500000,
        },
        employment: { employmentStatus: 'employed', contractType: 'indefinite', timeAtJob: 36 },
        documents: {
          idDocument: { fileName: 'cc.pdf' },
          incomeProof: { fileName: 'income.pdf' },
          employmentLetter: { fileName: 'letter.pdf' },
          bankStatement: { fileName: 'bank.pdf' },
        },
      }),
    )

    await renderProvider()

    expect(captured!.isLoading).toBe(false)
    expect(captured!.profile).toBeNull()
    expect(captured!.hasVerifiedProfile).toBe(false)
    expect(captured!.hasArriendoPass).toBe(false)
  })
})
