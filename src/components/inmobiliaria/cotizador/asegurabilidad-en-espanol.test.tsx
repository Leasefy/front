/**
 * QA-IA-95 (05-10-2026): el Resumen de Asegurabilidad decía «Stub» en cada
 * aseguradora, «SLA: OK» y la plata como «$55K» o «$1.4M/mes» (abreviaturas y
 * punto decimal en inglés). Ante la inmobiliaria: «De prueba (simulada)»,
 * «Responde bien» y la plata de la casa («$ 54.600»).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { CotizadorKpiStrip } from './CotizadorKpiStrip'
import { CotizadorCarriersStatus } from './CotizadorCarriersStatus'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('Asegurabilidad › Resumen en español de la casa (QA-IA-95)', () => {
  it('la prima y el costo con la plata de la casa, sin «K» ni «M»', () => {
    const kpis = { quotesHoy: 0, approvalRate: 2 / 3, primaPromedioMonthlyCop: 54600, costPerQuoteCop: 0 } as never
    act(() => root.render(<CotizadorKpiStrip kpis={kpis} />))
    const t = container.textContent ?? ''
    expect(t).toContain('$ 54.600')
    expect(t).not.toMatch(/\$\d+K|\d+(\.\d)?M\b/)
  })

  it('las aseguradoras simuladas dicen «De prueba (simulada)» y su estado en palabras, sin «Stub» ni «SLA:»', () => {
    const carriers = [
      { name: 'sura', enabled: true, mode: 'stub', slaState: 'healthy', lastVerdictAt: null },
      { name: 'mapfre', enabled: true, mode: 'rest', slaState: 'degraded', lastVerdictAt: null },
    ]
    act(() => root.render(<CotizadorCarriersStatus carriers={carriers as never} />))
    const t = container.textContent ?? ''
    expect(t).toContain('De prueba (simulada)')
    expect(t).toContain('Responde bien')
    expect(t).toContain('Lenta')
    expect(t).not.toMatch(/\bStub\b|SLA:|\bREST\b/)
  })
})
