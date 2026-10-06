/**
 * QA-IA-A (04-10-2026): «Reclamos» de la inmobiliaria prometía que al candidato
 * que no pasa se le da el motivo y este canal, pero el candidato no tenía por
 * dónde escribir. Ahora lo tiene en el detalle de su postulación (F-07).
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

const { reclamarMock, misReclamosMock } = vi.hoisted(() => ({ reclamarMock: vi.fn(), misReclamosMock: vi.fn() }))
vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    reclamar: (...a: unknown[]) => reclamarMock(...a),
    misReclamos: (...a: unknown[]) => misReclamosMock(...a),
  },
}))

import { PedirDetalleDelRechazo } from './PedirDetalleDelRechazo'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  reclamarMock.mockReset()
  misReclamosMock.mockReset()
  misReclamosMock.mockResolvedValue([])
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function escribir(el: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('PedirDetalleDelRechazo (F-07)', () => {
  it('muestra lo que ya escribió y lo que le respondió la inmobiliaria (la respuesta no llega por correo)', async () => {
    misReclamosMock.mockResolvedValue([
      { id: 'r-1', tipo: 'CORRECCION', mensaje: 'Mi ingreso es otro', createdAt: '2026-10-04T07:20:00Z', respuesta: 'Puedes volver a postularte con un codeudor.', respondidoEl: '2026-10-04T07:25:00Z' },
    ])
    await act(async () => {
      root.render(<PedirDetalleDelRechazo agencyId="ag-1" applicationId="app-1" nombre="Valentina" correo="v@example.test" />)
    })
    expect(misReclamosMock).toHaveBeenCalledWith('app-1')
    const lista = container.querySelector('[data-testid="mis-reclamos"]')!
    expect(lista.textContent).toContain('Mi ingreso es otro')
    expect(lista.textContent).toContain('Puedes volver a postularte con un codeudor.')
    expect(container.textContent).not.toContain('por correo')
  })

  it('manda el reclamo a la inmobiliaria con la postulación, el tipo y el mensaje', async () => {
    reclamarMock.mockResolvedValue({ id: 'r-1' })
    act(() =>
      root.render(<PedirDetalleDelRechazo agencyId="ag-1" applicationId="app-1" nombre="Valentina Ríos" correo="valentina@example.test" />),
    )
    const enviar = container.querySelector('[data-testid="reclamo-enviar"]') as HTMLButtonElement
    expect(enviar.disabled).toBe(true) // sin mensaje no se manda

    const radios = [...container.querySelectorAll('[role="radio"]')] as HTMLButtonElement[]
    act(() => radios[1].click()) // «Un dato mío está mal»
    act(() => escribir(container.querySelector('[data-testid="reclamo-mensaje"]') as HTMLTextAreaElement, 'Mi ingreso es $6.200.000, no $2.400.000.'))
    await act(async () => {
      ;(container.querySelector('[data-testid="reclamo-enviar"]') as HTMLButtonElement).click()
    })

    expect(reclamarMock).toHaveBeenCalledWith('ag-1', {
      applicationId: 'app-1',
      solicitanteNombre: 'Valentina Ríos',
      solicitanteCorreo: 'valentina@example.test',
      tipo: 'CORRECCION',
      mensaje: 'Mi ingreso es $6.200.000, no $2.400.000.',
    })
    expect(container.querySelector('[data-testid="reclamo-enviado"]')).toBeTruthy()
  })
})
