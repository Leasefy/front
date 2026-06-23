/**
 * ImagenesPanel.test.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * The maintenance vision panel MUST surface the analysis LIMITS — it can never
 * assert "clearance" for gas/electricidad/estructural (CONTEXT §compliance,
 * threat T-07-03). These tests pin that contract:
 *   1. safety_hold:true → a prominent safety-hold node is rendered.
 *   2. cannot_determine non-empty → the "no se puede determinar" list is rendered
 *      (never hidden).
 *   3. vision=[] → an empty-state is rendered (no crash, container non-empty).
 *   4. photo_quality_score is surfaced.
 *
 * createRoot + act pattern (same as TopObjectionsTable.test.tsx baseline).
 * @testing-library/react is NOT installed in this project.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock i18n — t echoes the key so we can assert on key presence.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { ImagenesPanel } from './ImagenesPanel'
import type { VisionAnalysis } from '@/lib/types/mantenimiento'

const DANGEROUS_VISION: VisionAnalysis = {
  safety_hold: true,
  requires_human_inspection: true,
  signals: ['indicios visibles consistentes con el reporte'],
  photo_quality_score: 78,
  cannot_determine: ['origen exacto / alcance interno no verificable por foto'],
}

const SAFE_VISION: VisionAnalysis = {
  safety_hold: false,
  requires_human_inspection: false,
  signals: ['daño visible coincide con la descripción'],
  photo_quality_score: 91,
  cannot_determine: [],
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

describe('<ImagenesPanel>', () => {
  it('renders a prominent safety-hold node when safety_hold:true', () => {
    act(() => {
      root.render(React.createElement(ImagenesPanel, { vision: [DANGEROUS_VISION] }))
    })
    const hold = container.querySelector('[data-testid="vision-safety-hold"]')
    expect(hold).not.toBeNull()
  })

  it('renders the cannot_determine list (never hides it) when non-empty', () => {
    act(() => {
      root.render(React.createElement(ImagenesPanel, { vision: [DANGEROUS_VISION] }))
    })
    const cannot = container.querySelector('[data-testid="vision-cannot-determine"]')
    expect(cannot).not.toBeNull()
    expect(cannot?.textContent).toContain('origen exacto')
  })

  it('surfaces photo_quality_score (0..100)', () => {
    act(() => {
      root.render(React.createElement(ImagenesPanel, { vision: [SAFE_VISION] }))
    })
    const quality = container.querySelector('[data-testid="vision-quality"]')
    expect(quality).not.toBeNull()
    expect(quality?.textContent).toContain('91')
  })

  it('renders an empty-state (no crash) when vision is empty', () => {
    act(() => {
      root.render(React.createElement(ImagenesPanel, { vision: [] }))
    })
    const empty = container.querySelector('[data-testid="vision-empty"]')
    expect(empty).not.toBeNull()
    // container must not be empty
    expect(container.firstChild).not.toBeNull()
  })

  it('does NOT render a safety-hold node when safety_hold:false', () => {
    act(() => {
      root.render(React.createElement(ImagenesPanel, { vision: [SAFE_VISION] }))
    })
    const hold = container.querySelector('[data-testid="vision-safety-hold"]')
    expect(hold).toBeNull()
  })
})
