/**
 * M3 — «Seleccionar» una cotización es aprobarla, y aprobar pide permiso de
 * edición. CONTADOR y VIEWER veían el botón y el back les contestaba 403
 * disfrazado de «Error al aprobar cotización». Sin `onSelectQuote` el
 * comparador compara, pero no ofrece aprobar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
  }),
}))

import { CotizacionComparator } from './CotizacionComparator'

const solicitud = {
  id: 'sol-1',
  consignacionId: 'cons-1',
  propertyId: 'prop-1',
  propertyTitle: 'Apto 402 — Laureles',
  propertyAddress: 'Cra 76 #34-12',
  type: 'plumbing',
  priority: 'medium',
  status: 'quoted',
  title: 'Gotera en el baño',
  description: 'El sifón gotea',
  photoUrls: [],
  paidBy: 'owner',
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
  quotes: [
    {
      id: 'q-1',
      providerName: 'Plomería Ruiz',
      providerPhone: '3001234567',
      amount: 180000,
      description: 'Cambio de sifón',
      estimatedDays: 2,
      createdAt: '2026-09-12T11:00:00.000Z',
    },
    {
      id: 'q-2',
      providerName: 'Arreglos Ya',
      providerPhone: '3007654321',
      amount: 220000,
      description: 'Sifón y empaque',
      estimatedDays: 1,
      createdAt: '2026-09-12T12:00:00.000Z',
    },
  ],
} as unknown as SolicitudMantenimiento

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const botonesDeSeleccionar = () =>
  [...container.querySelectorAll('button')].filter(
    (b) => (b.textContent ?? '').trim() === 'inmobiliaria.finance.quotes.select',
  )

describe('CotizacionComparator — aprobar sólo si alguien puede', () => {
  it('con `onSelectQuote`, cada cotización ofrece «Seleccionar» y lo manda con su id', async () => {
    const onSelectQuote = vi.fn()
    await act(async () => {
      root.render(<CotizacionComparator solicitud={solicitud} onSelectQuote={onSelectQuote} />)
    })

    const botones = botonesDeSeleccionar()
    expect(botones.length).toBeGreaterThan(0)
    await act(async () => {
      botones[0]!.click()
    })
    expect(onSelectQuote).toHaveBeenCalledTimes(1)
    expect(['q-1', 'q-2']).toContain(onSelectQuote.mock.calls[0]![0])
  })

  it('sin `onSelectQuote`, se comparan las cotizaciones pero no hay botón de aprobar', async () => {
    await act(async () => {
      root.render(<CotizacionComparator solicitud={solicitud} />)
    })

    expect(container.textContent).toContain('Plomería Ruiz')
    expect(botonesDeSeleccionar()).toHaveLength(0)
  })
})
