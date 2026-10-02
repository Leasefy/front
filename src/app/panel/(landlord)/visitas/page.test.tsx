/**
 * page.test.tsx — Visitas del propietario.
 *
 * 🔴 02-10-2026 (Nico): «Agendar visita» no se ofrece. `POST /visits` es sólo
 * para inquilinos (el back responde 403 a cualquier otro rol), así que el
 * botón abría un modal que SIEMPRE terminaba en error. Las visitas las pide
 * el inquilino; el propietario las confirma, reprograma o cancela.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { createVisit } = vi.hoisted(() => ({ createVisit: vi.fn() }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/lib/hooks/useVisits', () => ({
  useVisits: () => ({
    visits: [],
    stats: { total: 0, requested: 0, confirmed: 0, completed: 0, cancelled: 0, confirmedToday: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useVisitActions: () => ({
    confirm: vi.fn(),
    cancel: vi.fn(),
    reschedule: vi.fn(),
    complete: vi.fn(),
    create: createVisit,
  }),
}))

vi.mock('@/lib/hooks/useLandlord', () => ({
  useLandlordProperties: () => ({ properties: [{ id: 'p-1', title: 'Apto 101' }], isLoading: false }),
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import VisitasPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  createVisit.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

describe('Visitas del propietario', () => {
  it('🔴 no ofrece «Agendar visita»: el back sólo deja agendar a un inquilino', async () => {
    await act(async () => {
      root.render(React.createElement(VisitasPage))
    })
    // La pantalla cargó (el título está)…
    expect(container.textContent).toContain('landlord.visits.title')
    // …y no hay botón para agendar ni modal que lo haga.
    const botones = Array.from(document.body.querySelectorAll('button')).map((b) => b.textContent ?? '')
    expect(botones.some((t) => t.includes('landlord.visits.scheduleButton'))).toBe(false)
    expect(document.body.textContent).not.toContain('landlord.visits.scheduleButton')
    expect(createVisit).not.toHaveBeenCalled()
  })
})
