/**
 * use-mantenimiento-inbox.test.ts — Phase 7 plan 07-01 (Task 3 TDD)
 *
 * Covers the pure applyFilters helper (fast) + the hook's mock-mode resolve/sort.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

let _mockAgency: { id: string } | null = { id: 'agency-test-mant' }
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: _mockAgency }),
}))

import { useMantenimientoInbox, applyFilters } from './use-mantenimiento-inbox'
import { getMockInbox } from '@/lib/data/mock-mantenimiento'
import type { InboxFilters } from '@/lib/types/mantenimiento'

const NOW = new Date('2026-06-22T12:00:00.000Z')

// ── Pure helper tests (no DOM) ────────────────────────────────────────────

describe('applyFilters', () => {
  const cards = getMockInbox(NOW)

  it('no filters → returns all cards', () => {
    expect(applyFilters(cards, undefined).length).toBe(cards.length)
    expect(applyFilters(cards, {}).length).toBe(cards.length)
  })

  it('severidad filter narrows by membership', () => {
    const out = applyFilters(cards, { severidad: ['emergencia'] })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((c) => c.severidad === 'emergencia')).toBe(true)
  })

  it('categoria filter narrows by membership', () => {
    const out = applyFilters(cards, { categoria: ['gas', 'electricidad'] })
    expect(out.every((c) => c.categoria === 'gas' || c.categoria === 'electricidad')).toBe(true)
  })

  it('hasPhotos boolean filter is strict equality', () => {
    const out = applyFilters(cards, { hasPhotos: true })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((c) => c.hasPhotos === true)).toBe(true)
  })

  it('reabierto / retencionRiesgo / requiereAprobacion booleans narrow', () => {
    expect(applyFilters(cards, { reabierto: true }).every((c) => c.reabierto)).toBe(true)
    expect(applyFilters(cards, { retencionRiesgo: true }).every((c) => c.retencionRiesgo === true)).toBe(true)
    expect(applyFilters(cards, { requiereAprobacion: true }).every((c) => c.requiereAprobacion)).toBe(true)
  })

  it('slaBreached=true keeps only past-deadline cards (vs now? — uses deadline < Date)', () => {
    // slaBreached compares slaDeadlineAt to the current real clock; just assert it filters consistently
    const out = applyFilters(cards, { slaBreached: true })
    expect(out.every((c) => new Date(c.slaDeadlineAt).getTime() < Date.now())).toBe(true)
  })

  it('costoMin/costoMax range on costoEstimadoCop', () => {
    const out = applyFilters(cards, { costoMinCop: 1000000, costoMaxCop: 3000000 })
    expect(
      out.every((c) => c.costoEstimadoCop !== undefined && c.costoEstimadoCop >= 1000000 && c.costoEstimadoCop <= 3000000),
    ).toBe(true)
  })

  it('inmueble string filter is case-insensitive substring', () => {
    const sample = cards[0].inmueble.address.slice(0, 4).toUpperCase()
    const out = applyFilters(cards, { inmueble: sample })
    expect(out.length).toBeGreaterThan(0)
    expect(
      out.every((c) =>
        `${c.inmueble.address} ${c.inmueble.unit ?? ''}`.toLowerCase().includes(sample.toLowerCase()),
    )).toBe(true)
  })

  it('proveedor string filter matches proveedorSugerido (case-insensitive)', () => {
    const withProv = cards.find((c) => c.proveedorSugerido)!
    const frag = withProv.proveedorSugerido!.slice(0, 3)
    const out = applyFilters(cards, { proveedor: frag })
    expect(out.every((c) => (c.proveedorSugerido ?? '').toLowerCase().includes(frag.toLowerCase()))).toBe(true)
  })

  it('responsable filter narrows by membership', () => {
    const out = applyFilters(cards, { responsable: ['inquilino'] })
    expect(out.every((c) => c.responsableProbable === 'inquilino')).toBe(true)
  })

  it('estado filter narrows by membership', () => {
    const out = applyFilters(cards, { estado: ['recibido', 'resuelto'] })
    expect(out.every((c) => c.estado === 'recibido' || c.estado === 'resuelto')).toBe(true)
  })

  it('combined filters AND together', () => {
    const f: InboxFilters = { hasPhotos: true, severidad: ['emergencia'] }
    const out = applyFilters(cards, f)
    expect(out.every((c) => c.hasPhotos && c.severidad === 'emergencia')).toBe(true)
  })
})

// ── Hook tests (DOM) ──────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root
const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API
const ORIGINAL_DELAY = process.env.NEXT_PUBLIC_MOCK_DELAY_MS

function renderHook(filters?: InboxFilters): { current: ReturnType<typeof useMantenimientoInbox> | null } {
  const result: { current: ReturnType<typeof useMantenimientoInbox> | null } = { current: null }
  function Wrapper() {
    result.current = useMantenimientoInbox(filters)
    return null
  }
  act(() => {
    root.render(React.createElement(Wrapper))
  })
  return result
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_USE_MOCK_API
  process.env.NEXT_PUBLIC_MOCK_DELAY_MS = '10'
  _mockAgency = { id: 'agency-test-mant' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (ORIGINAL_MOCK === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK_API
  else process.env.NEXT_PUBLIC_USE_MOCK_API = ORIGINAL_MOCK
  if (ORIGINAL_DELAY === undefined) delete process.env.NEXT_PUBLIC_MOCK_DELAY_MS
  else process.env.NEXT_PUBLIC_MOCK_DELAY_MS = ORIGINAL_DELAY
})

describe('useMantenimientoInbox', () => {
  it('mock mode resolves cards sorted by score DESC with no filters', async () => {
    const result = renderHook()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.error).toBeNull()
    const data = result.current!.data
    expect(data.length).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].score).toBeGreaterThanOrEqual(data[i].score)
    }
  })

  it('mock mode + { severidad: [emergencia] } narrows', async () => {
    const result = renderHook({ severidad: ['emergencia'] })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    const data = result.current!.data
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c) => c.severidad === 'emergencia')).toBe(true)
  })

  it('mock mode + { hasPhotos: true } narrows', async () => {
    const result = renderHook({ hasPhotos: true })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    const data = result.current!.data
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c) => c.hasPhotos === true)).toBe(true)
  })
})
