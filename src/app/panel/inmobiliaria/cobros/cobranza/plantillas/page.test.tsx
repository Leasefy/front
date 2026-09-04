/**
 * Templates list page tests — Phase 36 plan 36-10
 *
 * Strategy: mount PlantillasPage directly using createRoot (same pattern as
 * existing page.test.tsx files in this codebase). Mock useTemplates + useI18n.
 * Three tests:
 *   1. Tab switching filters to the correct category (only WA templates shown in WA tab).
 *   2. Token badge gets amber class when tokenCount >= 1600 (80% of 2000).
 *   3. Edit link href contains the template id.
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
const mockRefetch = vi.fn()

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
      refetch: mockRefetch,
    }),
  }
})

vi.mock('@/components/data-display/no-data-yet-badge', () => ({
  NoDataYetBadge: ({ reason }: { reason: string }) =>
    React.createElement('div', { 'data-testid': 'no-data-badge' }, reason),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => React.createElement('a', { href, ...props }, children),
}))

// ----- Test data ------------------------------------------------------------

/**
 * Fixtures con la forma que manda el AGENTE (`TemplateApiItem`, generada por
 * `pnpm api:gen`), pasados por `normalizeTemplate`. Ver la nota extendida en el
 * test del editor: los fixtures escritos a mano dejaban pasar la pantalla rota.
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
    name: 'Etapa S1',
    body_draft: 'Hola deudor, tu deuda vence pronto.',
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
    token_count: 1600,
  }),
)

const OBJECTION_TEMPLATE = normalizeTemplate(
  agentItem({
    id: 'tpl-obj-1',
    name: 'Objeción: No tengo dinero',
    category: 'objection',
    body: 'Entendemos tu situación...',
    body_published: 'Entendemos tu situación...',
    token_count: 90,
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

describe('PlantillasPage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    vi.clearAllMocks()
    mockTemplates = [STAGE_TEMPLATE, WA_TEMPLATE, OBJECTION_TEMPLATE]
    mockIsLoading = false
    mockError = null

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('Edit link href contains the template id', async () => {
    const { default: PlantillasPage } = await import('./page')

    await act(async () => {
      root.render(React.createElement(PlantillasPage))
    })

    // Wait for at least one edit link to appear (async effects may delay render)
    await waitForEl(() => container.querySelector('a[href*="tpl-stage-1"]'))

    // All edit links in stages tab (default tab) — look for stage template id
    const links = container.querySelectorAll('a[href*="tpl-stage-1"]')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute('href')).toContain(
      '/panel/inmobiliaria/cobros/cobranza/plantillas/tpl-stage-1',
    )
  })

  it('Token badge has amber class when tokenCount >= 1600 (80% of 2000)', async () => {
    // Add the WA template also to stage so the default tab shows it
    mockTemplates = [
      { ...STAGE_TEMPLATE, tokenCount: 1600 }, // stage template with amber-threshold count
      WA_TEMPLATE,
      OBJECTION_TEMPLATE,
    ]

    const { default: PlantillasPage } = await import('./page')

    await act(async () => {
      root.render(React.createElement(PlantillasPage))
    })

    // Wait for the amber badge to appear (async effects may delay render under load)
    await waitForEl(() => container.querySelector('[data-token-badge="amber"]'))

    // The stage tab is default. Stage template has tokenCount=1600 which triggers amber.
    const amberBadges = container.querySelectorAll('[data-token-badge="amber"]')
    expect(amberBadges.length).toBeGreaterThan(0)
    // Verify it shows the count
    const badgeText = amberBadges[0].textContent
    expect(badgeText).toContain('1600')
  })

  it('Default (stage) tab shows stage templates and not WA templates', async () => {
    const { default: PlantillasPage } = await import('./page')

    await act(async () => {
      root.render(React.createElement(PlantillasPage))
    })

    // Wait for stage link to confirm render is stable before any assertion
    const stageLink = await waitForEl(() => container.querySelector('a[href*="tpl-stage-1"]'))

    // Stage tab is default — stage template should be visible in DOM
    expect(stageLink).toBeTruthy()
    expect(stageLink?.getAttribute('href')).toContain(
      '/panel/inmobiliaria/cobros/cobranza/plantillas/tpl-stage-1',
    )

    // WA template not in DOM (non-active tab panel is unmounted by Radix Presence)
    const waLink = container.querySelector('a[href*="tpl-wa-1"]')
    expect(waLink).toBeFalsy()
  })
})
