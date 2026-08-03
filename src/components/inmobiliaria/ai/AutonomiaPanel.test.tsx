/**
 * AutonomiaPanel.test.tsx — F6 workspace primitives.
 *
 * Covers the 4 render states (loading / error / not-available / happy), the
 * active-mode pill, unavailable-mode muting, the valla rows, the nota and the
 * T-323 callout.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Resolve chrome via the REAL es.json so literal assertions keep verifying
// the byte-identical es output (stub avoids the provider's localStorage effect).
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))


import { AutonomiaPanel } from './AutonomiaPanel'
import { I18nProvider } from '@/lib/i18n'
import type { AgentAutonomiaResponse } from '@/lib/api/agent-workspace'

const DATA: AgentAutonomiaResponse = {
  agente: 'conciliacion',
  modo: 'copiloto',
  modosDisponibles: ['sombra', 'copiloto'],
  valla: [
    { id: 'v1', label: 'Monto máximo auto-conciliable', value: '$0 (apagado)', estado: 'activo' },
    { id: 'v2', label: 'Auto-match', value: 'sombra', estado: 'inactivo' },
  ],
  t323: true,
  nota: 'Todos los agentes operan en Copiloto hasta certificar la valla.',
  generatedAt: new Date().toISOString(),
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
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

function render(props: Partial<React.ComponentProps<typeof AutonomiaPanel>> = {}) {
  act(() => {
    // Real I18nProvider (default 'es') — assertions check byte-identical es chrome.
    root.render(
      React.createElement(I18nProvider, null, React.createElement(AutonomiaPanel, { data: null, ...props })),
    )
  })
}

describe('AutonomiaPanel — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="autonomia-panel-loading"]')).not.toBeNull()
  })

  it('renders the error banner', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="autonomia-panel-error"]')
    expect(err).not.toBeNull()
    expect(err!.textContent).toContain('500')
  })

  it('renders the friendly not-available panel when data is null (404)', () => {
    render({ data: null })
    const empty = container.querySelector('[data-testid="autonomia-panel-empty"]')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toContain('aún no está disponible')
    expect(container.querySelector('[data-testid="autonomia-panel-error"]')).toBeNull()
  })
})

describe('AutonomiaPanel — happy path', () => {
  it('highlights the active mode and mutes unavailable modes', () => {
    render({ data: DATA })
    const copiloto = container.querySelector('[data-testid="autonomia-modo-copiloto"]')!
    const sombra = container.querySelector('[data-testid="autonomia-modo-sombra"]')!
    const autonomo = container.querySelector('[data-testid="autonomia-modo-autonomo"]')!

    expect(copiloto.getAttribute('aria-current')).toBe('true')
    expect(sombra.getAttribute('aria-current')).toBeNull()
    // autonomo is not in modosDisponibles → muted
    expect(autonomo.className).toContain('opacity-40')
    expect(copiloto.className).not.toContain('opacity-40')
  })

  it('renders the nota, the valla rows and the T-323 callout', () => {
    render({ data: DATA })

    expect(container.querySelector('[data-testid="autonomia-nota"]')!.textContent).toContain(
      'Copiloto hasta certificar',
    )

    const v1 = container.querySelector('[data-testid="autonomia-valla-v1"]')!
    expect(v1.textContent).toContain('Monto máximo auto-conciliable')
    expect(v1.textContent).toContain('$0 (apagado)')

    const t323 = container.querySelector('[data-testid="autonomia-t323"]')!
    expect(t323.textContent).toContain('T-323/2024')
  })

  it('omits the T-323 callout when t323 is false', () => {
    render({ data: { ...DATA, t323: false } })
    expect(container.querySelector('[data-testid="autonomia-t323"]')).toBeNull()
  })

  it('renders the ACTIVE mode hint as visible text (tooltips are invisible on touch)', () => {
    render({ data: DATA })
    const hint = container.querySelector('[data-testid="autonomia-modo-hint"]')
    expect(hint).not.toBeNull()
    // copiloto is the active mode → its hint shows
    expect(hint!.textContent).toContain('Sugiere; nada se aplica sin un humano')
    // the title= tooltips on the pills are kept
    expect(
      container.querySelector('[data-testid="autonomia-modo-copiloto"]')!.getAttribute('title'),
    ).toContain('Sugiere')
  })

  it('renders the sombra hint when sombra is the active mode', () => {
    render({ data: { ...DATA, modo: 'sombra' } })
    expect(container.querySelector('[data-testid="autonomia-modo-hint"]')!.textContent).toContain(
      'Solo observa y sugiere en silencio',
    )
  })
})
