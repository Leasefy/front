/**
 * page.test.tsx — /aprobacion/estado/[orderId], pantalla de cierre del
 * Slice 1 del pre-scoring de afianzamiento.
 *
 * El segmento se llama `orderId` (Slice 1 rework): es el `orderId` que
 * devuelve `POST /pre-scoring`, no un `solicitudId`.
 *
 * NO dispara pre-scoring ni hace polling: el back lo dispara en el webhook de
 * Wompi. Esta pantalla solo lee el `?status=` de la vuelta de Wompi y decide
 * entre "revisá tu correo" (pago recibido) y "el pago no se completó".
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

let mockStatus: string | null = null

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'ord-123' }),
  useSearchParams: () => ({ get: (key: string) => (key === 'status' ? mockStatus : null) }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: null }),
}))

import AprobacionEstadoPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  mockStatus = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function mount() {
  act(() => {
    root.render(<AprobacionEstadoPage />)
  })
}

describe('<AprobacionEstadoPage>', () => {
  it('sin status (visita directa tras el pago): muestra el mensaje de revisar el correo', () => {
    mockStatus = null
    mount()
    expect(container.textContent).toMatch(/revis[aá].*correo/i)
    expect(container.textContent).toMatch(/48 horas/i)
  })

  it('status APPROVED: muestra el mensaje de revisar el correo', () => {
    mockStatus = 'APPROVED'
    mount()
    expect(container.textContent).toMatch(/revis[aá].*correo/i)
  })

  it('status PENDING: muestra el mensaje de revisar el correo', () => {
    mockStatus = 'PENDING'
    mount()
    expect(container.textContent).toMatch(/revis[aá].*correo/i)
  })

  it('status DECLINED: muestra que el pago no se completó y un CTA para reintentar', () => {
    mockStatus = 'DECLINED'
    mount()
    expect(container.textContent).toMatch(/no se complet/i)
    const retry = container.querySelector('a[href="/aprobacion"]')
    expect(retry).toBeTruthy()
    expect(retry?.textContent).toMatch(/volver a intentar/i)
  })

  it('status VOIDED: muestra que el pago no se completó', () => {
    mockStatus = 'VOIDED'
    mount()
    expect(container.textContent).toMatch(/no se complet/i)
  })

  it('status ERROR: muestra que el pago no se completó', () => {
    mockStatus = 'ERROR'
    mount()
    expect(container.textContent).toMatch(/no se complet/i)
  })

  it('no llama a fetch — no hace polling ni dispara el pre-scoring', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    mount()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
