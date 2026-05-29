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
const mockRefetch = vi.fn()

vi.mock('@/lib/hooks/cobranza/use-templates', () => ({
  useTemplates: () => ({
    data: { templates: mockTemplates },
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}))

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

const STAGE_TEMPLATE = {
  id: 'tpl-stage-1',
  name: 'Etapa S1',
  category: 'stage' as const,
  bodyDraft: 'Hola deudor, tu deuda vence pronto.',
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
  tokenCount: 1600,
  updatedAt: '2026-05-29T10:00:00Z',
}

const OBJECTION_TEMPLATE = {
  id: 'tpl-obj-1',
  name: 'Objeción: No tengo dinero',
  category: 'objection' as const,
  bodyDraft: 'Entendemos tu situación...',
  bodyPublished: null,
  status: 'draft' as const,
  waSubmissionStatus: null,
  tokenCount: 90,
  updatedAt: '2026-05-29T10:00:00Z',
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

    // All edit links in stages tab (default tab) — look for stage template id
    const links = container.querySelectorAll('a[href*="tpl-stage-1"]')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute('href')).toContain(
      '/panel/inmobiliaria/ai/cobranza/plantillas/tpl-stage-1',
    )
  })

  it('Token badge has amber class when tokenCount >= 1600 (80% of 2000)', async () => {
    const { default: PlantillasPage } = await import('./page')

    await act(async () => {
      root.render(React.createElement(PlantillasPage))
    })

    // Switch to WhatsApp tab to see the WA template with tokenCount=1600
    const tabs = container.querySelectorAll('[role="tab"]')
    const waTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('whatsapp'))
    expect(waTab).toBeTruthy()

    await act(async () => {
      waTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // Find token badge with amber styling — it is marked with data-token-badge attribute
    const amberBadges = container.querySelectorAll('[data-token-badge="amber"]')
    expect(amberBadges.length).toBeGreaterThan(0)
    // Verify it shows the count
    const badgeText = amberBadges[0].textContent
    expect(badgeText).toContain('1600')
  })

  it('Tab "WhatsApp" panel shows WA template but not stage template', async () => {
    const { default: PlantillasPage } = await import('./page')

    await act(async () => {
      root.render(React.createElement(PlantillasPage))
    })

    // Click WhatsApp tab
    const tabs = container.querySelectorAll('[role="tab"]')
    const waTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('whatsapp'))
    expect(waTab).toBeTruthy()

    await act(async () => {
      waTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // WA template name should appear in active panel
    const waLink = container.querySelector('a[href*="tpl-wa-1"]')
    expect(waLink).toBeTruthy()
    // Stage link should not appear in WA panel (stage links only exist in stage tab panel which is inactive)
    // We can verify by checking the active tab content doesn't contain stage template link
    const activePanel = container.querySelector('[role="tabpanel"][data-state="active"]')
    if (activePanel) {
      const stageInActive = activePanel.querySelector('a[href*="tpl-stage-1"]')
      expect(stageInActive).toBeFalsy()
    }
  })
})
