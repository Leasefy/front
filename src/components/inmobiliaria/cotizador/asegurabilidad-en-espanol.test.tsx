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

  it('la prima promedio y el costo por consulta salen al peso (son promedios, no plata guardada)', () => {
    const kpis = { quotesHoy: 6, approvalRate: 0.41, primaPromedioMonthlyCop: 132328.57142857142, costPerQuoteCop: 12.6 } as never
    act(() => root.render(<CotizadorKpiStrip kpis={kpis} />))
    const t = container.textContent ?? ''
    expect(t).toMatch(/\$\s132\.329(?![\d,])/)
    expect(t).toMatch(/\$\s13(?![\d.,])/)
    expect(t).not.toMatch(/,\d/)
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

describe('Asegurabilidad › Resumen: una respuesta y como máximo cuatro cifras (revisora r25)', () => {
  it('con las opcionales, arriba cuántas salieron asegurables; la franja con cuatro; lo demás plegado', () => {
    const kpis = {
      quotesHoy: 6, approvalRate: 0.5, primaPromedioMonthlyCop: 54600, costPerQuoteCop: 10,
      asegurablesCount: 12, tasaAsegurabilidad: 0.6, multiOpcionCount: 4, sinAseguradoraCount: 3,
      tiempoRespuestaSeconds: 30, arriendosCerrados: 2, valorAseguradoCop: 1_000_000,
    } as never
    act(() => root.render(<CotizadorKpiStrip kpis={kpis} />))
    expect(container.querySelector('[data-testid="cotizador-asegurables"]')?.textContent).toContain('12')
    expect(container.querySelector('[data-testid="cotizador-asegurables"]')?.textContent).toContain('60 %')
    const franja = container.querySelector('[data-testid="cotizador-cifras"]')!.textContent ?? ''
    expect(franja).toMatch(/\$\s54\.600/)
    expect(franja).not.toMatch(/\$\s1\.000\.000/) // el valor asegurado va plegado
    expect(franja).not.toMatch(/\b30s\b/) // el tiempo de respuesta, también
    expect(container.querySelector('[data-testid="cotizador-mas-cifras"]')).not.toBeNull()
  })
})
