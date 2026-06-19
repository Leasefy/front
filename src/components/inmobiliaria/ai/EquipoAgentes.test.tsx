/**
 * EquipoAgentes.test.tsx — F10 hub real.
 *
 * Covers the 4 render states, the per-role grouping, the disponible:false
 * "sin datos" rendering and the Sala/Cola deep-links (incl. cobranza's
 * escalaciones queue + cotizador's cola).
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

import { EquipoAgentes } from './EquipoAgentes'
import { I18nProvider } from '@/lib/i18n'
import type { AiHubResumenResponse } from '@/lib/api/agent-workspace'

const RESUMEN: AiHubResumenResponse = {
  colas: [
    {
      rol: 'cobrador',
      label: 'Cobrador',
      total: 5,
      agentes: [{ agente: 'cobranza', enCola: 5, disponible: true }],
    },
    {
      rol: 'analista_riesgo',
      label: 'Analista de riesgo',
      total: 3,
      agentes: [{ agente: 'estudio', enCola: 3, disponible: true }],
    },
    {
      rol: 'contador',
      label: 'Contador',
      total: 7,
      agentes: [
        { agente: 'conciliacion', enCola: 7, disponible: true },
        // pre-migration table: count failed server-side
        { agente: 'pagos', enCola: 0, disponible: false },
      ],
    },
    {
      rol: 'comercial',
      label: 'Comercial',
      total: 2,
      agentes: [
        { agente: 'matching', enCola: 0, disponible: true },
        { agente: 'cotizador', enCola: 2, disponible: true },
      ],
    },
  ],
  totalEnCola: 17,
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

function render(props: Partial<React.ComponentProps<typeof EquipoAgentes>> = {}) {
  act(() => {
    // Real I18nProvider (default 'es') — assertions check byte-identical es chrome.
    root.render(
      React.createElement(I18nProvider, null, React.createElement(EquipoAgentes, { data: null, ...props })),
    )
  })
}

describe('EquipoAgentes — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="equipo-agentes-loading"]')).not.toBeNull()
  })

  it('renders the error banner', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="equipo-agentes-error"]')
    expect(err).not.toBeNull()
    expect(err!.textContent).toContain('500')
  })

  it('renders the graceful panel on 404 / null data (NOT an error)', () => {
    render({ notAvailable: true })
    expect(container.querySelector('[data-testid="equipo-agentes-empty"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="equipo-agentes-error"]')).toBeNull()
    // No deep links rendered in the graceful state
    expect(container.querySelectorAll('a').length).toBe(0)
  })
})

describe('EquipoAgentes — happy path', () => {
  it('renders the aggregate header + the 4 role groups with their agents', () => {
    render({ data: RESUMEN })

    expect(container.querySelector('[data-testid="equipo-total"]')!.textContent).toContain('17')

    for (const rol of ['cobrador', 'analista_riesgo', 'contador', 'comercial']) {
      expect(container.querySelector(`[data-testid="equipo-rol-${rol}"]`)).not.toBeNull()
    }

    // Agents land inside their role group
    const contador = container.querySelector('[data-testid="equipo-rol-contador"]')!
    expect(contador.querySelector('[data-testid="equipo-agente-conciliacion"]')).not.toBeNull()
    expect(contador.querySelector('[data-testid="equipo-agente-pagos"]')).not.toBeNull()
    expect(contador.textContent).toContain('Contador')

    // enCola badge
    const conciliacion = contador.querySelector('[data-testid="equipo-agente-conciliacion"]')!
    expect(conciliacion.querySelector('[data-testid="equipo-en-cola"]')!.textContent).toContain('7')
  })

  it('disponible:false renders "—" + "sin datos" hint, NOT an error', () => {
    render({ data: RESUMEN })
    const pagos = container.querySelector('[data-testid="equipo-agente-pagos"]')!
    const sinDatos = pagos.querySelector('[data-testid="equipo-sin-datos"]')
    expect(sinDatos).not.toBeNull()
    expect(sinDatos!.textContent).toContain('—')
    expect(sinDatos!.textContent).toContain('sin datos')
    expect(pagos.querySelector('[data-testid="equipo-en-cola"]')).toBeNull()
    expect(container.querySelector('[data-testid="equipo-agentes-error"]')).toBeNull()
  })

  it('links Sala and Cola per agent (cobranza → escalaciones; cotizador → cola)', () => {
    render({ data: RESUMEN })

    expect(
      container.querySelector('[data-testid="equipo-sala-conciliacion"]')!.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/ai/conciliacion')
    expect(
      container.querySelector('[data-testid="equipo-cola-conciliacion"]')!.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/ai/conciliacion/cola')

    // cobranza's human queue is escalaciones
    expect(
      container.querySelector('[data-testid="equipo-cola-cobranza"]')!.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/ai/cobranza/escalaciones')

    // cotizador's cola
    expect(
      container.querySelector('[data-testid="equipo-cola-cotizador"]')!.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/ai/cotizador/cola')
    expect(
      container.querySelector('[data-testid="equipo-sala-cotizador"]')!.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/ai/cotizador')
  })
})
