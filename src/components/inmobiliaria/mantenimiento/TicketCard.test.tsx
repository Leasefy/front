/**
 * TicketCard.test.tsx — Phase 7 plan 07-03 (DASH-02)
 *
 * NOTE: @testing-library/react is NOT installed in this project.
 * Uses the repo-standard createRoot + act pattern (same as CostPerPesoKpi.test.tsx).
 * i18n is mocked to echo the key, so assertions check the i18n KEY (proving the
 * component uses t(...) and never hardcodes Spanish/English literals).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { MaintenanceTicketCard } from '@/lib/types/mantenimiento'

void React // keep import alive under "jsx": "preserve"

// Mock i18n — echo the key so we can assert on it.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { TicketCard } from './TicketCard'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const NOW_ISO = new Date('2026-06-20T12:00:00Z').toISOString()

function makeCard(overrides: Partial<MaintenanceTicketCard> = {}): MaintenanceTicketCard {
  return {
    id: overrides.id ?? 'tkt-1',
    titulo: overrides.titulo ?? 'Fuga de agua en cocina',
    inmueble: overrides.inmueble ?? { address: 'Carrera 7 #45-12', unit: 'Apto 302' },
    score: overrides.score ?? 82,
    bucket: overrides.bucket ?? 'alto',
    categoria: overrides.categoria ?? 'plomeria',
    severidad: overrides.severidad ?? 'alta',
    estado: overrides.estado ?? 'proveedor_sugerido',
    createdAt: overrides.createdAt ?? NOW_ISO,
    slaDeadlineAt: overrides.slaDeadlineAt ?? new Date('2026-06-22T12:00:00Z').toISOString(),
    proveedorSugerido: 'proveedorSugerido' in overrides ? overrides.proveedorSugerido : 'Plomería Express SAS',
    requiereAprobacion: overrides.requiereAprobacion ?? true,
    hasPhotos: overrides.hasPhotos ?? true,
    reabierto: overrides.reabierto ?? false,
    retencionRiesgo: overrides.retencionRiesgo,
    costoEstimadoCop: overrides.costoEstimadoCop,
    responsableProbable: overrides.responsableProbable ?? 'inquilino',
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<TicketCard>', () => {
  it('Test A: with proveedorSugerido + requiereAprobacion=true shows titulo, address, score, approval key, provider', () => {
    const ticket = makeCard({ requiereAprobacion: true, proveedorSugerido: 'Plomería Express SAS', score: 82 })
    act(() => {
      root.render(React.createElement(TicketCard, { ticket, onSelect: () => {} }))
    })
    const text = container.textContent ?? ''
    expect(text).toContain('Fuga de agua en cocina')
    expect(text).toContain('Carrera 7 #45-12')
    expect(text).toContain('82')
    // approval badge uses the canonical C7-03 key
    expect(text).toContain('inmobiliaria.ai.mantenimiento.card.requiereAprobacion')
    // provider name surfaced
    expect(text).toContain('Plomería Express SAS')
  })

  it('Test B: without proveedorSugerido and requiereAprobacion=false renders no approval badge / no provider block', () => {
    const ticket = makeCard({ requiereAprobacion: false, proveedorSugerido: undefined })
    act(() => {
      root.render(React.createElement(TicketCard, { ticket, onSelect: () => {} }))
    })
    const text = container.textContent ?? ''
    expect(text).not.toContain('inmobiliaria.ai.mantenimiento.card.requiereAprobacion')
    // no provider name; the "sinProveedor" fallback key may show instead
    expect(text).not.toContain('Plomería Express SAS')
  })

  it('Test C: clicking the card fires onSelect with the id', () => {
    const ticket = makeCard({ id: 'tkt-click' })
    let selected: string | null = null
    act(() => {
      root.render(
        React.createElement(TicketCard, {
          ticket,
          onSelect: (id: string) => {
            selected = id
          },
        }),
      )
    })
    const el = container.querySelector('[role="button"]') as HTMLElement | null
    expect(el).not.toBeNull()
    act(() => {
      el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(selected).toBe('tkt-click')
  })

  it('responsable is shown as a HYPOTHESIS (uses the enum key, never a verdict literal)', () => {
    const ticket = makeCard({ responsableProbable: 'inquilino' })
    act(() => {
      root.render(React.createElement(TicketCard, { ticket, onSelect: () => {} }))
    })
    const text = container.textContent ?? ''
    expect(text).toContain('inmobiliaria.ai.mantenimiento.enums.responsable.inquilino')
  })
})
