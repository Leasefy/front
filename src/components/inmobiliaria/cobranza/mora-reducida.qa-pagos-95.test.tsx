/**
 * N-10 (QA-PAGOS-95 ronda 2): «Mora reducida» dice de cuánto a cuánto y desde
 * qué día; sin cartera hoy no hay «recuperación».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
const h = vi.hoisted(() => ({ rec: null as Record<string, unknown> | null }))
vi.mock('@/lib/hooks/cobranza/use-recovery', () => ({ useRecovery: () => ({ data: h.rec }) }))
vi.mock('@/lib/hooks/cobranza/use-daily-report', () => ({ useDailyReport: () => ({ data: null }) }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    formatCurrency: (n: number) => `$ ${n}`,
    formatNumber: (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 }),
  }),
}))
vi.mock('@leasefy/cadence', () => ({
  Stagger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StaggerItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KpiCard: (p: { label: string; value: string | null; sublabel: string; 'data-testid': string }) => (
    <div data-testid={p['data-testid']}>
      {p.label}|{p.value ?? '—'}|{p.sublabel}
    </div>
  ),
}))

import { CobranzaResultadosKpis } from './CobranzaResultadosKpis'

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
const base = { moraWindowDays: 90 }

describe('N-10 · la tarjeta de la mora', () => {
  it('🔴 dice de cuánto a cuánto y desde qué día', () => {
    h.rec = { ...base, moraReducedPct: 4.3, moraDesdePct: 12.5, moraHastaPct: 8.3, moraDesdeDia: '2026-09-01', moraSinCarteraHoy: false }
    act(() => root.render(<CobranzaResultadosKpis overview={null} />))
    const t = container.querySelector('[data-testid="cobranza-kpi-mora"]')!.textContent!
    expect(t).toContain('Mora reducida')
    expect(t).toContain('De 12,5 % a 8,3 % desde el 1 de septiembre de 2026')
  })

  it('🔴 sin cartera hoy no es «mora reducida»: no hay recuperación que medir', () => {
    h.rec = { ...base, moraReducedPct: null, moraDesdePct: 66.7, moraHastaPct: 0, moraDesdeDia: '2026-10-03', moraSinCarteraHoy: true }
    act(() => root.render(<CobranzaResultadosKpis overview={null} />))
    const t = container.querySelector('[data-testid="cobranza-kpi-mora"]')!.textContent!
    expect(t).not.toContain('Mora reducida')
    expect(t).toContain('Hoy no hay cartera en mora')
  })
})
