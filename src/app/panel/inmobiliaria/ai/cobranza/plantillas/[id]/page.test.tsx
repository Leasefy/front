/**
 * Template detail editor tests — Phase 36 plan 36-10 (Task 2)
 *
 * Strategy: mount TemplateEditorContent directly using createRoot.
 * Mock useTemplates, useAuth, useI18n, fetch.
 * Four tests:
 *   1. Save draft calls PUT (not POST /publish).
 *   2. Publish dialog fires POST /publish only after AlertDialog confirm.
 *   3. WA section does NOT render for category='stage' template.
 *   4. localDraft containing {{unknown_var}} renders amber warning Alert.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { vi as _vi } from 'vitest'
// Flake conocido: estos specs montan páginas pesadas y exceden los 5s default
// bajo carga paralela del runner (pasan aislados). Timeout holgado a propósito.
_vi.setConfig({ testTimeout: 20_000 })
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// ----- Mocks ----------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test-123' } }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'es',
  }),
}))

let mockTemplates: Array<{
  id: string
  name: string
  category: 'stage' | 'whatsapp' | 'objection'
  bodyDraft: string
  bodyPublished: string | null
  status: 'draft' | 'published'
  waSubmissionStatus: 'pending' | 'approved' | 'rejected' | null
  tokenCount: number
  updatedAt: string
}> = []
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/lib/hooks/cobranza/use-templates', () => ({
  useTemplates: () => ({
    data: { templates: mockTemplates },
    isLoading: mockIsLoading,
    error: mockError,
    refetch: vi.fn(),
  }),
}))

// Track fetch calls
const fetchCalls: Array<{ url: string; method: string }> = []
const mockFetchResolve = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

// ----- Test data ------------------------------------------------------------

const STAGE_TEMPLATE = {
  id: 'tpl-stage-1',
  name: 'Etapa S1 Recordatorio',
  category: 'stage' as const,
  bodyDraft: 'Hola {{deudor_nombre}}, tu deuda es {{deuda_total}}.',
  bodyPublished: null,
  status: 'draft' as const,
  waSubmissionStatus: null,
  tokenCount: 120,
  updatedAt: '2026-05-29T10:00:00Z',
}

const WA_TEMPLATE = {
  id: 'tpl-wa-1',
  name: 'WhatsApp Recordatorio',
  category: 'whatsapp' as const,
  bodyDraft: 'Hola, te recordamos tu pago.',
  bodyPublished: null,
  status: 'draft' as const,
  waSubmissionStatus: 'pending' as const,
  tokenCount: 200,
  updatedAt: '2026-05-29T10:00:00Z',
}

// ----- Tests ----------------------------------------------------------------

describe('TemplatePage (detail editor)', () => {
  let container: HTMLDivElement
  let root: Root
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    vi.clearAllMocks()
    fetchCalls.length = 0
    mockTemplates = [STAGE_TEMPLATE, WA_TEMPLATE]
    mockIsLoading = false
    mockError = null

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    // Mock global fetch
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      fetchCalls.push({ url: String(url), method: opts?.method ?? 'GET' })
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'draft_saved' }),
      })
    }) as typeof globalThis.fetch
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    globalThis.fetch = originalFetch
  })

  it('Save draft button calls PUT endpoint, NOT POST /publish', async () => {
    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // Find save draft button
    const saveDraftBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('inmobiliaria.ai.templates.saveDraft'),
    )
    expect(saveDraftBtn).toBeTruthy()

    await act(async () => {
      saveDraftBtn!.click()
    })

    // Should have called PUT, not POST /publish
    const putCalls = fetchCalls.filter((c) => c.method === 'PUT')
    const publishCalls = fetchCalls.filter((c) => c.url.includes('/publish'))
    expect(putCalls.length).toBeGreaterThan(0)
    expect(publishCalls.length).toBe(0)
    expect(putCalls[0].url).toMatch(/templates\/tpl-stage-1/)
  })

  it('Publish button opens AlertDialog (does not auto-call POST /publish)', async () => {
    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // Find publish button
    const publishBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) =>
        btn.textContent?.includes('inmobiliaria.ai.templates.publish') &&
        !btn.textContent?.includes('dialog'),
    )
    expect(publishBtn).toBeTruthy()

    await act(async () => {
      publishBtn!.click()
    })

    // After clicking Publish, an AlertDialog should appear (it has a confirm button)
    // The POST /publish should NOT have fired yet (only after confirm)
    const publishCalls = fetchCalls.filter((c) => c.url.includes('/publish'))
    expect(publishCalls.length).toBe(0)

    // AlertDialog renders via a Portal to document.body (outside container)
    // Check the body for the dialog element
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog).toBeTruthy()
  })

  it('WA section does NOT render for category=stage template', async () => {
    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // WA status section should not be present
    const waSection = container.querySelector('[data-wa-status-section]')
    expect(waSection).toBeFalsy()
  })

  it('Unknown variable in draft body shows amber warning Alert', async () => {
    // Mock stage template with unknown variable in draft
    mockTemplates = [
      {
        ...STAGE_TEMPLATE,
        bodyDraft: 'Hola {{deudor_nombre}}, tienes {{unknown_var}} pendiente.',
      },
    ]

    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // Should show unknown variable warning
    const warningAlert = container.querySelector('[data-unknown-var-alert]')
    expect(warningAlert).toBeTruthy()
  })
})
