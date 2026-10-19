import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

void React

const autorizacion = vi.fn()
vi.mock('@/lib/api/calificacion-leasefy.service', () => ({
  calificacionLeasefyApi: { autorizacion: () => autorizacion(), decidir: vi.fn() },
}))
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: () => Promise.resolve({ title: 'Autorización', text: 'Texto legal' }) },
}))

import { CasillaDeLaCalificacion } from './CasillaDeLaCalificacion'

let host: HTMLDivElement
let root: Root

async function pintar() {
  await act(async () => {
    root.render(<CasillaDeLaCalificacion marcada={false} onCambio={() => {}} />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('la casilla de la Calificación Leasefy en la postulación', () => {
  beforeEach(() => {
    autorizacion.mockReset()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('sin autorizar: sale aparte y SIN marcar', async () => {
    autorizacion.mockResolvedValue({ vigente: false, hayVersionNueva: false })
    await pintar()
    expect(host.querySelector('[data-testid="casilla-calificacion"]')).not.toBeNull()
    expect(host.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('false')
  })

  it('ya autorizó: no se le vuelve a preguntar', async () => {
    autorizacion.mockResolvedValue({ vigente: true, hayVersionNueva: false })
    await pintar()
    expect(host.querySelector('[data-testid="calificacion-ya-autorizada"]')).not.toBeNull()
    expect(host.querySelector('[role="checkbox"]')).toBeNull()
  })

  it('sin sesión (invitado): no se ofrece', async () => {
    autorizacion.mockRejectedValue(new Error('401'))
    await pintar()
    expect(host.textContent).toBe('')
  })
})
