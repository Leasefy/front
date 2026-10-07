import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · Elegir inquilino en el portal del propietario: con la red caída
 * (`status: 0`, `network`) se decía «Próximamente», como si el portal no
 * estuviera habilitado. Ahora se habla de la conexión.
 */

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const { elegirMock } = vi.hoisted(() => ({ elegirMock: vi.fn() }))
vi.mock('@/lib/api/owner-seleccion.service', () => ({ ownerSeleccionApi: { elegir: elegirMock } }))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

import { ComparacionView } from './ComparacionView'

const COMPARACION = {
  snapshotHash: 'h1',
  candidates: [
    { id: 'c1', candidateName: 'Ana Pérez', stage: 'evaluado', insurabilityVerdict: 'Asegurable', elegible: true, score: 80 },
  ],
} as unknown as React.ComponentProps<typeof ComparacionView>['comparacion']

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toast.mockClear()
  toast.error.mockClear()
  elegirMock.mockReset()
  act(() => {
    root.render(<ComparacionView agencyId="ag1" processId="p1" comparacion={COMPARACION} reload={vi.fn()} />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function elegirYConfirmar() {
  const boton = (texto: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!
  await act(async () => {
    boton('Elegir').click()
  })
  await act(async () => {
    boton('Confirmar').click()
    await Promise.resolve()
  })
}

describe('ComparacionView — elegir', () => {
  it('🔴 con la red caída habla de la conexión, no de «Próximamente»', async () => {
    elegirMock.mockResolvedValue({ ok: false, status: 0, data: null, error: 'network' })
    await elegirYConfirmar()
    expect(toast).not.toHaveBeenCalledWith('Próximamente', expect.anything())
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(String(toast.error.mock.calls[0][1]?.description)).toMatch(/conexión/)
  })

  it('con el portal sin cablear sigue diciendo «Próximamente»', async () => {
    elegirMock.mockResolvedValue({ ok: false, status: 0, data: null, error: 'unavailable' })
    await elegirYConfirmar()
    expect(toast).toHaveBeenCalledWith('Próximamente', expect.anything())
  })

  it('🔴 un 5xx dice que fue nuestro, no «Error 500»', async () => {
    elegirMock.mockResolvedValue({ ok: false, status: 500, data: null, error: 'Error 500' })
    await elegirYConfirmar()
    const descripcion = String(toast.error.mock.calls[0][1]?.description)
    expect(descripcion).toMatch(/algo falló de nuestro lado/)
    expect(descripcion).not.toContain('Error 500')
  })
})
