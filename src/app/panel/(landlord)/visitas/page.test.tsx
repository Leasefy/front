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

const { createVisit, datos } = vi.hoisted(() => ({
  createVisit: vi.fn(),
  datos: { visits: [] as unknown[] },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/lib/hooks/useVisits', () => ({
  useVisits: () => ({
    visits: datos.visits,
    stats: { total: datos.visits.length, requested: 0, confirmed: 0, completed: 0, cancelled: 0, confirmedToday: 0 },
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
  datos.visits = []
})

const visita = (id: string, nombre: string, status: string) => ({
  id,
  candidateId: `t-${id}`,
  candidateName: nombre,
  propertyId: 'p-1',
  propertyTitle: 'Apto 101',
  requestedDate: '2026-10-25',
  requestedTime: '10:00',
  status,
  visitType: 'in_person',
  createdAt: '2026-10-20T10:00:00Z',
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

  it('lo pendiente primero: con visitas por confirmar entra en esa pestaña', async () => {
    datos.visits = [visita('1', 'Ana Pide', 'requested'), visita('2', 'Beto Ya Fue', 'completed')]
    await act(async () => {
      root.render(React.createElement(VisitasPage))
    })
    expect(container.textContent).toContain('Ana Pide')
    expect(container.textContent).not.toContain('Beto Ya Fue')
  })

  it('sin nada por confirmar entra en «Todas»', async () => {
    datos.visits = [visita('2', 'Beto Ya Fue', 'completed')]
    await act(async () => {
      root.render(React.createElement(VisitasPage))
    })
    expect(container.textContent).toContain('Beto Ya Fue')
  })
})
