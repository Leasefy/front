/**
 * MantenimientoKpiStrip.test.tsx — Phase 7 plan 07-02 (DASH-01)
 *
 * Tests the three render branches of the maintenance overview KPI strip:
 *   1. isLoading=true  → skeletons (.animate-pulse) present, NO formatted values
 *   2. kpis populated  → 9 fields rendered; the 2 anti-gaming columns live inside
 *                        a separated [data-testid="anti-gaming"] block
 *   3. kpis=null       → no crash; [data-testid="kpi-strip"] still present
 *
 * NOTE: @testing-library/react is NOT installed in this project.
 * Uses the createRoot + act pattern (same baseline as CostPerPesoKpi.test.tsx).
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock i18n — t echoes the key so we can assert structure without locale coupling.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { MantenimientoKpiStrip } from './MantenimientoKpiStrip'
import type { MaintenanceKpis } from '@/lib/types/mantenimiento'

const POPULATED_KPIS: MaintenanceKpis = {
  ticketsAbiertos: 12,
  emergenciasActivas: 3,
  vencidos: 5,
  tiempoPrimeraRespuestaMin: 18,
  slaCumplidoPct: 95,
  reaperturas30dPct: 7,
  tiempoResolucionRealDias: 4,
  costoEstimadoAbiertoCop: 12_500_000,
  propietariosEnRiesgo: 2,
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

describe('<MantenimientoKpiStrip>', () => {
  it('renders skeletons (animate-pulse) and no formatted values when isLoading=true', () => {
    act(() => {
      root.render(
        React.createElement(MantenimientoKpiStrip, { kpis: POPULATED_KPIS, isLoading: true }),
      )
    })
    // Skeletons present
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    // The formatted values must NOT leak while loading
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/12/)
    expect(text).not.toMatch(/95%/)
    // Strip container still present
    expect(container.querySelector('[data-testid="kpi-strip"]')).not.toBeNull()
  })

  it('renders all 9 fields and a separated anti-gaming block when populated', () => {
    act(() => {
      root.render(
        React.createElement(MantenimientoKpiStrip, { kpis: POPULATED_KPIS, isLoading: false }),
      )
    })
    const text = container.textContent ?? ''
    // Health values
    expect(text).toMatch(/12/) // ticketsAbiertos
    expect(text).toMatch(/3/) // emergenciasActivas
    expect(text).toMatch(/95%/) // slaCumplidoPct
    expect(text).toMatch(/12\.5M/) // costoEstimadoAbiertoCop compact COP
    // Anti-gaming block exists and contains the two anti-gaming metrics
    const antiGaming = container.querySelector('[data-testid="anti-gaming"]')
    expect(antiGaming).not.toBeNull()
    const antiText = antiGaming?.textContent ?? ''
    expect(antiText).toMatch(/7%/) // reaperturas30dPct
    expect(antiText).toMatch(/4/) // tiempoResolucionRealDias
  })

  it('does not crash and keeps the strip present when kpis=null', () => {
    act(() => {
      root.render(React.createElement(MantenimientoKpiStrip, { kpis: null, isLoading: false }))
    })
    expect(container.querySelector('[data-testid="kpi-strip"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="anti-gaming"]')).not.toBeNull()
  })

  /**
   * Lo que no se pudo traer NO se dibuja como cero.
   *
   * `kpis=null` es «la consulta falló o el endpoint todavía no existe», no «tu
   * operación está en cero». Con `?? 0` la franja decía «0 tickets abiertos» y
   * «0 % de SLA» mientras el cartel de error vivía debajo: tranquilizaba y
   * avisaba del fallo al mismo tiempo. Los nueve valores van con raya.
   */
  it('nunca imprime 0 cuando kpis=null: los 9 valores van con raya', () => {
    act(() => {
      root.render(React.createElement(MantenimientoKpiStrip, { kpis: null, isLoading: false }))
    })
    const valores = Array.from(
      container.querySelectorAll('[data-testid="kpi-strip"] p.text-xl'),
    ).map((el) => el.textContent ?? '')

    expect(valores).toHaveLength(9)
    for (const v of valores) {
      expect(v).toBe('—')
      expect(v).not.toMatch(/\d/)
    }
  })
})
