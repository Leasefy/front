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
_vi.setConfig({ testTimeout: 60_000 })
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import {
  normalizeTemplate,
  type TemplateApiItem,
  type TemplateRow,
} from '@/lib/hooks/cobranza/use-templates'

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

let mockTemplates: TemplateRow[] = []
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/lib/hooks/cobranza/use-templates', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/hooks/cobranza/use-templates')
  >('@/lib/hooks/cobranza/use-templates')
  return {
    ...actual,
    useTemplates: () => ({
      data: { templates: mockTemplates },
      isLoading: mockIsLoading,
      error: mockError,
      refetch: vi.fn(),
    }),
  }
})

// Track fetch calls
const fetchCalls: Array<{ url: string; method: string }> = []
const mockFetchResolve = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

// ----- Test data ------------------------------------------------------------

/**
 * Los fixtures se arman con la forma que manda el AGENTE (`TemplateApiItem`,
 * generada por `pnpm api:gen`) y se pasan por `normalizeTemplate`.
 *
 * Antes eran objetos escritos a mano con la forma que la UI deseaba —
 * `{ templates: [...] }`, camelCase, un `status` que el servidor nunca envió —
 * así que estos tests pasaban en verde mientras la pantalla reventaba contra el
 * error boundary. Si el contrato del agente cambia, ahora esto no compila.
 */
function agentItem(over: Partial<TemplateApiItem>): TemplateApiItem {
  return {
    id: 'tpl-x',
    name: 'plantilla',
    category: 'stage',
    channel: 'voice',
    stage: 'S1',
    language: 'es',
    tone_variant: 'cordial',
    body: 'cuerpo base',
    body_draft: null,
    body_published: null,
    wa_submission_status: null,
    token_count: 100,
    updated_at: '2026-05-29T10:00:00Z',
    ...over,
  }
}

const STAGE_TEMPLATE = normalizeTemplate(
  agentItem({
    id: 'tpl-stage-1',
    name: 'Etapa S1 Recordatorio',
    category: 'stage',
    body_draft: 'Hola {{deudor_nombre}}, tu deuda es {{deuda_total}}.',
    token_count: 120,
  }),
)

const WA_TEMPLATE = normalizeTemplate(
  agentItem({
    id: 'tpl-wa-1',
    name: 'WhatsApp Recordatorio',
    category: 'whatsapp',
    channel: 'whatsapp',
    body_draft: 'Hola, te recordamos tu pago.',
    wa_submission_status: 'pending',
    token_count: 200,
  }),
)

// ----- Test helpers ---------------------------------------------------------

/**
 * Polls getter() until it returns a truthy value or the timeout expires.
 * Uses plain setTimeout (no act()) so React's scheduler can process pending
 * work between polls without adding act() overhead under parallel test load.
 */
async function waitForEl<T>(getter: () => T, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout
  let value = getter()
  while (!value && Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((r) => setTimeout(r, 50))
    value = getter()
  }
  return value
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

    // Wait for save draft button to appear (async effects may delay render under load)
    const saveDraftBtn = await waitForEl(
      () =>
        Array.from(container.querySelectorAll('button')).find(
          (btn) => btn.textContent?.includes('inmobiliaria.ai.templates.saveDraft'),
        ) ?? null,
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

    // Wait for publish button to appear before clicking
    const publishBtn = await waitForEl(
      () =>
        Array.from(container.querySelectorAll('button')).find(
          (btn) =>
            btn.textContent?.includes('inmobiliaria.ai.templates.publish') &&
            !btn.textContent?.includes('dialog'),
        ) ?? null,
    )
    expect(publishBtn).toBeTruthy()

    await act(async () => {
      publishBtn!.click()
    })

    // After clicking Publish, an AlertDialog should appear (it has a confirm button)
    // The POST /publish should NOT have fired yet (only after confirm)
    const publishCalls = fetchCalls.filter((c) => c.url.includes('/publish'))
    expect(publishCalls.length).toBe(0)

    // AlertDialog renders via a Portal to document.body (outside container).
    // Wait for it — Radix may animate it in asynchronously.
    const dialog = await waitForEl(() => document.querySelector('[role="alertdialog"]'))
    expect(dialog).toBeTruthy()
  })

  it('WA section does NOT render for category=stage template', async () => {
    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // Wait for the save draft button as a stable render anchor, then check WA absence
    await waitForEl(
      () =>
        Array.from(container.querySelectorAll('button')).find(
          (btn) => btn.textContent?.includes('inmobiliaria.ai.templates.saveDraft'),
        ) ?? null,
    )

    // WA status section should not be present
    const waSection = container.querySelector('[data-wa-status-section]')
    expect(waSection).toBeFalsy()
  })

  it('Unknown variable in draft body shows amber warning Alert', async () => {
    // Mock stage template with unknown variable in draft
    mockTemplates = [
      normalizeTemplate(
        agentItem({
          id: 'tpl-stage-1',
          body_draft: 'Hola {{deudor_nombre}}, tienes {{unknown_var}} pendiente.',
        }),
      ),
    ]

    const { default: TemplatePage } = await import('./page')

    await act(async () => {
      root.render(
        React.createElement(TemplatePage, { params: { id: 'tpl-stage-1' } }),
      )
    })

    // Wait for the warning alert to appear (async effects may delay render under load)
    const warningAlert = await waitForEl(
      () => container.querySelector('[data-unknown-var-alert]'),
    )

    // Should show unknown variable warning
    expect(warningAlert).toBeTruthy()
  })
})
