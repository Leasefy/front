/**
 * TicketDetail.test.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Tests the TicketDetail COMPONENT directly (not the page) so we don't have to
 * mock next/navigation or the hook:
 *   1. With a full MaintenanceTicketDetail mock, all 5 panel data-testids render.
 *   2. Clicking the asignar CTA forwards to the onAsignar prop exactly once.
 *   3. The header shows the ticket title.
 *
 * createRoot + act; @testing-library/react is NOT installed.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { TicketDetail } from './TicketDetail'
import type { MaintenanceTicketDetail } from '@/lib/types/mantenimiento'

const DETAIL: MaintenanceTicketDetail = {
  id: 'mant-001',
  titulo: 'Olor a gas en la cocina',
  inmueble: { address: 'Carrera 7 # 45-12', unit: 'Apto 302' },
  score: 96,
  bucket: 'emergencia',
  categoria: 'gas',
  severidad: 'emergencia',
  estado: 'proveedor_sugerido',
  createdAt: '2026-06-22T10:00:00.000Z',
  slaDeadlineAt: '2026-06-22T12:00:00.000Z',
  proveedorSugerido: 'GasExpress SAS',
  requiereAprobacion: false,
  hasPhotos: true,
  reabierto: false,
  retencionRiesgo: true,
  costoEstimadoCop: 850000,
  responsableProbable: 'propietario',
  descripcion: 'El inquilino reporta olor a gas persistente.',
  queEntendi: 'Posible fuga de gas en la cocina; requiere atención inmediata.',
  clasificacion: {
    categoria: 'gas',
    severidad: 'emergencia',
    score: 96,
    bucket: 'emergencia',
    rationale: 'Olor a gas implica riesgo de seguridad inmediato.',
  },
  vision: [
    {
      safety_hold: true,
      requires_human_inspection: true,
      signals: ['indicios visibles consistentes con el reporte'],
      photo_quality_score: 78,
      cannot_determine: ['origen exacto no verificable por foto'],
    },
  ],
  proveedorRecomendado: {
    principal: { nombre: 'GasExpress SAS', rating: 4.6, etaHoras: 2, motivo: 'Mejor calificación.' },
    backup: { nombre: 'Proveedor alterno', rating: 4.2, etaHoras: 48 },
  },
  aprobacion: { capCop: 2000000, estimatedMaxCop: 850000, requiresApproval: true },
  eventos: [],
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

function noop() {}

describe('<TicketDetail>', () => {
  it('renders all 5 detail panels', () => {
    act(() => {
      root.render(
        React.createElement(TicketDetail, {
          detail: DETAIL,
          onAsignar: noop,
          onPedirInfo: noop,
          onSolicitarAprobacion: noop,
          onEscalar: noop,
          onCerrar: noop,
        }),
      )
    })
    for (const id of [
      'que-entendi-panel',
      'clasificacion-panel',
      'imagenes-panel',
      'proveedor-panel',
      'aprobacion-panel',
    ]) {
      expect(container.querySelector(`[data-testid="${id}"]`), id).not.toBeNull()
    }
  })

  it('forwards the asignar CTA to onAsignar exactly once', () => {
    const onAsignar = vi.fn()
    act(() => {
      root.render(
        React.createElement(TicketDetail, {
          detail: DETAIL,
          onAsignar,
          onPedirInfo: noop,
          onSolicitarAprobacion: noop,
          onEscalar: noop,
          onCerrar: noop,
        }),
      )
    })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="cta-asignar"]')
    expect(btn).not.toBeNull()
    expect(btn?.disabled).toBe(false) // proveedor_sugerido is an allowed origin
    act(() => {
      btn?.click()
    })
    expect(onAsignar).toHaveBeenCalledTimes(1)
  })

  it('shows the ticket title in the header', () => {
    act(() => {
      root.render(
        React.createElement(TicketDetail, {
          detail: DETAIL,
          onAsignar: noop,
          onPedirInfo: noop,
          onSolicitarAprobacion: noop,
          onEscalar: noop,
          onCerrar: noop,
        }),
      )
    })
    expect(container.textContent).toContain('Olor a gas en la cocina')
  })
})
