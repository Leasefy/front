/**
 * SalaAgente.test.tsx — F6 workspace primitives.
 *
 * Covers the 4 render states (loading / error / not-available / happy) plus
 * the KPI formatter (number / percent / cop) and the cola CTA count.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Resolve chrome via the REAL es.json so literal assertions keep verifying
// the byte-identical es output (stub avoids the provider's localStorage effect).
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))


// next/link renders fine without a Next router when reduced to an anchor.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))

import { SalaAgente, formatKpiValue } from './SalaAgente'
import { I18nProvider } from '@/lib/i18n'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'

const OVERVIEW: AgentOverviewResponse = {
  agente: 'conciliacion',
  kpis: [
    { id: 'en_cola', label: 'En cola', value: 1234, format: 'number' },
    { id: 'auto_rate', label: 'Tasa de cruce', value: 0.825, format: 'percent' },
    { id: 'monto', label: 'Monto conciliado', value: 1250000, format: 'cop' },
  ],
  pipeline: [
    { estado: 'en_revision', count: 12 },
    { estado: 'resuelto', count: 30 },
  ],
  feed: [
    {
      id: 'f1',
      titulo: 'Cruce confirmado',
      detalle: 'Movimiento $1.250.000 · recaudo',
      actorType: 'agent',
      occurredAt: new Date().toISOString(),
    },
  ],
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
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof SalaAgente>> = {}) {
  act(() => {
    root.render(
      // Real I18nProvider (default 'es') — assertions check byte-identical es chrome.
      React.createElement(
        I18nProvider,
        null,
        React.createElement(SalaAgente, {
          agente: 'conciliacion',
          titulo: 'Conciliación bancaria',
          descripcion: 'El agente cruza los movimientos.',
          overview: null,
          colaHref: '/panel/inmobiliaria/ai/conciliacion/cola',
          ...props,
        }),
      ),
    )
  })
}

describe('formatKpiValue', () => {
  it('formats number / percent / cop in es-CO', () => {
    expect(formatKpiValue(1234, 'number')).toBe('1.234')
    const pct = formatKpiValue(0.825, 'percent')
    expect(pct).toContain('82,5')
    expect(pct).toContain('%')
    const cop = formatKpiValue(1250000, 'cop')
    expect(cop).toContain('1.250.000')
    expect(cop).toContain('$')
  })
})

describe('SalaAgente — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="sala-agente-loading"]')).not.toBeNull()
  })

  it('renders the error banner', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="sala-agente-error"]')
    expect(err).not.toBeNull()
    expect(err!.textContent).toContain('500')
  })

  it('renders the friendly not-available panel when overview is null (404)', () => {
    render({ overview: null })
    const empty = container.querySelector('[data-testid="sala-agente-empty"]')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toContain('Aún no hay actividad')
    // NOT an error banner
    expect(container.querySelector('[data-testid="sala-agente-error"]')).toBeNull()
  })

  it('renders header + KPIs + pipeline + feed on happy path', () => {
    render({ overview: OVERVIEW, colaCount: 12 })

    // Header + CTA with count — breadcrumb (MigaDePan): "Agentes IA · <título>"
    expect(container.textContent).toContain('Conciliación bancaria')
    const cta = container.querySelector('[data-testid="sala-cola-cta"]')
    expect(cta).not.toBeNull()
    expect(cta!.textContent).toContain('Por revisar (12)')
    expect(cta!.getAttribute('href')).toBe('/panel/inmobiliaria/ai/conciliacion/cola')

    // KPI strip with formatted values
    expect(container.querySelector('[data-testid="sala-kpi-en_cola"]')!.textContent).toContain('1.234')
    expect(container.querySelector('[data-testid="sala-kpi-auto_rate"]')!.textContent).toContain('82,5')
    expect(container.querySelector('[data-testid="sala-kpi-monto"]')!.textContent).toContain('1.250.000')

    // Pipeline legend with estado labels (conciliacion per-agent override) + counts
    const pipeline = container.querySelector('[data-testid="sala-pipeline"]')
    expect(pipeline).not.toBeNull()
    expect(pipeline!.textContent).toContain('En tu revisión')
    expect(pipeline!.textContent).toContain('12')
    expect(pipeline!.textContent).toContain('Conciliado')

    // Feed entry with actor badge
    const feed = container.querySelector('[data-testid="sala-feed"]')
    expect(feed).not.toBeNull()
    expect(feed!.textContent).toContain('Cruce confirmado')
    expect(feed!.textContent).toContain('Agente')
  })

  it('renders the domain children slot', () => {
    render({
      overview: OVERVIEW,
      children: React.createElement('div', { 'data-testid': 'domain-slot' }, 'extra'),
    })
    expect(container.querySelector('[data-testid="domain-slot"]')).not.toBeNull()
  })
})
