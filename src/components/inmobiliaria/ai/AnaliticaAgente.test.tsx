/**
 * AnaliticaAgente.test.tsx — F10 workspace primitives.
 *
 * Covers the 4 render states (loading / error / not-available / happy), the
 * pure-CSS bar count per serie, and the all-zeros "Sin actividad" state.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Resolve chrome via the REAL es.json so literal assertions keep verifying
// the byte-identical es output (stub avoids the provider's localStorage effect).
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))


import { AnaliticaAgente } from './AnaliticaAgente'
import { I18nProvider } from '@/lib/i18n'
import type { AgentAnaliticaResponse } from '@/lib/api/agent-workspace'

function buildPoints(values: number[]): Array<{ date: string; value: number }> {
  return values.map((value, i) => ({
    date: `2026-05-${String(10 + i).padStart(2, '0')}`,
    value,
  }))
}

const ANALITICA: AgentAnaliticaResponse = {
  agente: 'conciliacion',
  resumen: [
    { id: 'casos_30d', label: 'Casos (30d)', value: 1234, format: 'number' },
    { id: 'auto_rate', label: 'Tasa de cruce', value: 0.825, format: 'percent' },
    { id: 'monto', label: 'Monto conciliado', value: 1250000, format: 'cop' },
  ],
  series: [
    {
      id: 'casos_dia',
      label: 'Casos por día',
      format: 'number',
      points: buildPoints(Array.from({ length: 30 }, (_, i) => (i % 7 === 0 ? 0 : i))),
    },
    {
      id: 'sin_actividad',
      label: 'Serie vacía',
      format: 'number',
      points: buildPoints(Array.from({ length: 30 }, () => 0)),
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
})

function render(props: Partial<React.ComponentProps<typeof AnaliticaAgente>> = {}) {
  act(() => {
    // Real I18nProvider (default 'es') — assertions check byte-identical es chrome.
    root.render(
      React.createElement(I18nProvider, null, React.createElement(AnaliticaAgente, { data: null, ...props })),
    )
  })
}

describe('AnaliticaAgente — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="analitica-loading"]')).not.toBeNull()
  })

  it('renders the error banner without leaking the raw backend message', () => {
    render({ error: 'Internal Server Error' })
    const err = container.querySelector('[data-testid="analitica-error"]')
    expect(err).not.toBeNull()
    expect(err!.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })

  /*
   * 🔴 Este test decía lo contrario: exigía que un 404 pintara un cartel
   * amable con «El agente aún no reporta analítica», y que NO se viera como
   * error. Pero la ruta `…/agentes/{agente}/analitica` no existe en el
   * microservicio: el 404 es permanente. Decirle «todavía no hay datos» a un
   * fallo que nunca se va a resolver solo es la forma más segura de que nadie
   * lo arregle. Ahora tiene que verse como fallo.
   */
  it('muestra el 404 como fallo, no como vacío amable', () => {
    render({ notAvailable: true })
    const fallo = container.querySelector('[data-testid="analitica-no-disponible"]')
    expect(fallo).not.toBeNull()
    expect(fallo!.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(fallo!.textContent).not.toContain('aún no reporta')
    // Sobre una ruta que no existe, reintentar sería mentir.
    expect(fallo!.querySelector('[data-testid="reintentar"]')).toBeNull()
  })

  it('sin datos y sin bandera, también es un fallo', () => {
    render({ data: null })
    expect(container.querySelector('[data-testid="analitica-no-disponible"]')).not.toBeNull()
  })
})

describe('AnaliticaAgente — happy path', () => {
  it('renders the resumen KPI strip with es-CO formats', () => {
    render({ data: ANALITICA })
    const strip = container.querySelector('[data-testid="analitica-resumen"]')
    expect(strip).not.toBeNull()
    expect(container.querySelector('[data-testid="analitica-kpi-casos_30d"]')!.textContent).toContain('1.234')
    expect(container.querySelector('[data-testid="analitica-kpi-auto_rate"]')!.textContent).toContain('82,5')
    expect(container.querySelector('[data-testid="analitica-kpi-monto"]')!.textContent).toContain('1.250.000')
  })

  it('renders one bar per daily point (30 bars) with per-day tooltips', () => {
    render({ data: ANALITICA })
    const serie = container.querySelector('[data-testid="analitica-serie-casos_dia"]')
    expect(serie).not.toBeNull()
    const bars = serie!.querySelectorAll('[data-testid="analitica-bar"]')
    expect(bars.length).toBe(30)
    // Every bar carries a title tooltip with the formatted value
    expect(bars[1].getAttribute('title')).toBeTruthy()
    // Accessible summary on the bar row
    expect(serie!.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('Casos por día')
  })

  it('renders "Sin actividad en 30 días" for an all-zeros serie (no bars)', () => {
    render({ data: ANALITICA })
    const serie = container.querySelector('[data-testid="analitica-serie-sin_actividad"]')
    expect(serie).not.toBeNull()
    expect(serie!.textContent).toContain('Sin actividad en 30 días')
    expect(serie!.querySelectorAll('[data-testid="analitica-bar"]').length).toBe(0)
  })
})
