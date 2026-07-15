/**
 * CostKpiStrip.test.tsx — Phase 35 plan 35-10 (Task 2 TDD RED → GREEN)
 *
 * Tests for CostKpiStrip using createRoot/act pattern (no @testing-library/react).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

// Mock shadcn tooltip — avoid Radix UI dependency in test env
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'tooltip-content' }, children),
}))

import { CostKpiStrip } from './CostKpiStrip'

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

function renderStrip(props: Parameters<typeof CostKpiStrip>[0]) {
  act(() => {
    root.render(React.createElement(CostKpiStrip, props))
  })
  return container
}

describe('CostKpiStrip', () => {
  it('Test 1 — renders em dash when forecast30dUsd is null (never 0 or $0.00)', () => {
    const el = renderStrip({
      kpis: { costPerQuoteUsd: 0.0025, monthlyBurnUsd: 1.5, forecast30dUsd: null },
      isLoading: false,
    })

    const text = el.textContent ?? ''
    // The forecast KPI should display "—" (em dash)
    expect(text).toContain('—')
    // NEVER render "$0.00" as a standalone forecast value (the only $0.XX pattern allowed is from other KPIs with more decimals)
    // The forecast card should show "—" not "$0.00"
    // We verify by checking "$X.XX\n" style exact forecast value is NOT "$0.00"
    // Since forecast returns "—" when null, the text should NOT contain "$0.00" immediately after forecast label
    const forecastLabel = 'inmobiliaria.ai.cotizador.costos.kpiForecast30d'
    const forecastIdx = text.indexOf(forecastLabel)
    // After the forecast label, check what value appears
    const afterForecast = text.slice(forecastIdx + forecastLabel.length, forecastIdx + forecastLabel.length + 20)
    expect(afterForecast).toContain('—')
    expect(afterForecast).not.toContain('$0.00')
  })

  it('Test 2 — forecast caption renders even when forecast30dUsd is null', () => {
    const el = renderStrip({
      kpis: { costPerQuoteUsd: 0.0025, monthlyBurnUsd: 1.5, forecast30dUsd: null },
      isLoading: false,
    })

    // The i18n key for the caption should be present in the DOM
    const text = el.textContent ?? ''
    expect(text).toContain('inmobiliaria.ai.cotizador.costos.forecastCaption')
  })

  it('Test 3 — renders 3 animate-pulse skeleton divs when isLoading=true', () => {
    renderStrip({
      kpis: null,
      isLoading: true,
    })

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('Test 4 — renders formatted value when forecast30dUsd is a positive number', () => {
    const el = renderStrip({
      kpis: { costPerQuoteUsd: 0.0025, monthlyBurnUsd: 1.5, forecast30dUsd: 2.85 },
      isLoading: false,
    })

    const text = el.textContent ?? ''
    // Should contain the formatted forecast value
    expect(text).toContain('$2.85')
  })
})
