/**
 * ApplicationContext — confirmed-steps behavior.
 *
 * Prefilled data must never mark wizard steps as completed: a step counts as
 * completed only after the user explicitly advances through it
 * (tryAdvanceStep). The prefill also raises a dismissible notice.
 *
 * New test file (the older ApplicationContext.*.test.tsx suites carry a
 * pre-existing cadence dual-React failure baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/api/client', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
}))

vi.mock('@/lib/api/legal.service', () => ({
  getConsentText: vi.fn(() =>
    Promise.resolve({ version: 'v1', text: 'Consent text' }),
  ),
}))

const getPrefill = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    get getPrefill() {
      return getPrefill
    },
  },
}))

import { ApplicationProvider, useApplication } from './ApplicationContext'

void React // jsx-preserve

const PROPERTY_ID = 'prop-test-1'
const STORAGE_KEY = `arriendo-facil-application-${PROPERTY_ID}`

/** Complete, step-1-valid prefill payload (mirrors GET /applications/prefill). */
const FULL_PREFILL = {
  hasPreviousApplication: true,
  fullName: 'Ana Maria Rojas',
  documentType: 'cc',
  documentNumber: '1090525663',
  dateOfBirth: '1990-05-20',
  phone: '3001234567',
  email: 'ana@ejemplo.com',
  currentAddress: 'Calle 123 #45-67, Bogotá',
  timeAtCurrentAddress: 24,
  maritalStatus: 'single',
  dependents: 0,
  employmentStatus: 'employed',
  companyName: 'Tech SAS',
  monthlySalary: 5000000,
}

let container: HTMLDivElement
let root: Root
let ctx: ReturnType<typeof useApplication> | null = null

function Probe() {
  ctx = useApplication()
  return null
}

async function renderProvider() {
  await act(async () => {
    root.render(
      <ApplicationProvider propertyId={PROPERTY_ID}>
        <Probe />
      </ApplicationProvider>,
    )
  })
}

describe('ApplicationContext confirmed steps', () => {
  beforeEach(() => {
    localStorage.clear()
    ctx = null
    getPrefill.mockReset()
    getPrefill.mockResolvedValue(FULL_PREFILL)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('prefilled data does NOT mark any step as completed and raises the notice', async () => {
    await renderProvider()

    // Prefill landed in the form…
    expect(ctx!.application.personal.fullName).toBe('Ana Maria Rojas')
    // …but nothing is completed and the disclosure notice is up
    expect(ctx!.completedSteps).toEqual([])
    expect(ctx!.canSubmit).toBe(false)
    expect(ctx!.showPrefillNotice).toBe(true)
  })

  it('advancing through a valid step marks it confirmed and persists to the draft', async () => {
    await renderProvider()

    let advanced = false
    await act(async () => {
      advanced = ctx!.tryAdvanceStep()
    })

    expect(advanced).toBe(true)
    expect(ctx!.completedSteps).toEqual([1])
    expect(ctx!.currentStep).toBe(2)

    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      confirmedSteps?: number[]
    } | null
    expect(draft?.confirmedSteps).toEqual([1])
  })

  it('dismissing the prefill notice hides it and persists the dismissal', async () => {
    await renderProvider()

    await act(async () => {
      ctx!.dismissPrefillNotice()
    })

    expect(ctx!.showPrefillNotice).toBe(false)
    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      prefillNoticeDismissed?: boolean
    } | null
    expect(draft?.prefillNoticeDismissed).toBe(true)
  })

  it('shows no notice when there is no previous application', async () => {
    getPrefill.mockResolvedValue({ hasPreviousApplication: false })

    await renderProvider()

    expect(ctx!.showPrefillNotice).toBe(false)
    expect(ctx!.application.personal.fullName).toBeFalsy()
  })

  it('tryAdvanceStep on an invalid step confirms nothing', async () => {
    getPrefill.mockResolvedValue({ hasPreviousApplication: false })

    await renderProvider()

    let advanced = true
    await act(async () => {
      advanced = ctx!.tryAdvanceStep()
    })

    expect(advanced).toBe(false)
    expect(ctx!.completedSteps).toEqual([])
    expect(ctx!.currentStep).toBe(1)
  })
})
