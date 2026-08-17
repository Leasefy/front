/**
 * DigestView tests — crash guard for `digest.payload` absent.
 *
 * The generated/back contract types `payload` as possibly-absent
 * (`ownerGet<Digest>` does no runtime validation), so a period whose digest
 * exists but whose payload hasn't landed yet must render an honest
 * "no disponible" state instead of throwing on `p.periodo`/etc.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { DigestView } from './DigestView'
import type { Digest, DigestPayload } from '@/lib/api/owner-novedades.types'

void React

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

const PAYLOAD: DigestPayload = {
  periodo: '2026-07',
  generadoEn: '2026-08-01T00:00:00.000Z',
  recaudo: { totalCop: 1_000_000, porInmueble: [] },
  ocupacion: { totalProperties: 3, occupied: 2, vacant: 1, occupancyPct: 66.6 },
  solicitudes: { creadas: 1, resueltas: 1, abiertas: 0, nota: '' },
  danos: { available: false, resueltosCount: 0, resueltos: [] },
  contratosPorVencer: [],
  actionItems: { decisionesPendientes: [], preavisos: [] },
}

describe('DigestView', () => {
  it('renders the payload when present', () => {
    const digest: Digest = {
      periodo: '2026-07',
      payload: PAYLOAD,
      generatedAt: '2026-08-01T00:00:00.000Z',
      deliveredAt: null,
      deliveryChannel: null,
    }

    act(() => {
      root.render(React.createElement(DigestView, { digest }))
    })

    expect(container.textContent ?? '').toContain('2026-07')
  })

  it('renders a "no disponible" state without throwing when payload is null', () => {
    const digest = {
      periodo: '2026-07',
      payload: null,
      generatedAt: '2026-08-01T00:00:00.000Z',
      deliveredAt: null,
      deliveryChannel: null,
    } as unknown as Digest

    expect(() => {
      act(() => {
        root.render(React.createElement(DigestView, { digest }))
      })
    }).not.toThrow()

    expect(container.textContent ?? '').toContain('Próximamente')
  })
})
