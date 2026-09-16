/**
 * @vitest-environment happy-dom
 *
 * Los estados de la tarjeta de Visitas que no son «listo»:
 * - F6: un mandato migrado sin inmueble pedía `/propiedades/null/disponibilidad`
 *   (un 400) y ofrecía un «Reintentar» que nunca iba a funcionar.
 * - Un fallo de carga dice qué pasó y reintenta sólo si sirve.
 * - F12: al guardar, el `catch {}` se tragaba el motivo que el back sí daba.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { agenda, toastMock } = vi.hoisted(() => ({
  agenda: { getDisponibilidad: vi.fn(), setDisponibilidad: vi.fn() },
  toastMock: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/lib/api/agenda.service', () => ({ agendaApi: agenda }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/components/panel/AvailabilityScheduleEditor', () => ({
  AvailabilityScheduleEditor: () => null,
}))

import { VisitasDelInmueble } from './VisitasDelInmueble'

const tick = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })

describe('<VisitasDelInmueble> — sin inmueble, fallo de carga y motivo al guardar', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function montar(propertyId?: string) {
    act(() => {
      root.render(<VisitasDelInmueble propertyId={propertyId} />)
    })
    await tick()
  }

  it('sin inmueble no pide nada y lo dice, sin spinner eterno ni «Reintentar»', async () => {
    await montar(undefined)

    expect(agenda.getDisponibilidad).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
    expect(container.textContent).toContain('no tiene un inmueble asociado')
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    expect(container.querySelector('[data-testid="visitas-interruptor"]')).toBeNull()
  })

  it('un 500 al leer los horarios dice que falló y reintentar vuelve a pedirlos', async () => {
    agenda.getDisponibilidad.mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
    await montar('prop-1')

    const fallo = container.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo).not.toBeNull()
    expect(fallo?.getAttribute('data-enmarcado')).toBe('no')

    agenda.getDisponibilidad.mockResolvedValueOnce({ windows: [], agendas: null, visitTypes: [] })
    await act(async () => {
      ;(container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement).click()
    })
    await tick()

    expect(agenda.getDisponibilidad).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(container.querySelector('[data-testid="visitas-interruptor"]')).not.toBeNull()
  })

  it('un 404 no ofrece reintentar: pedirlo otra vez no lo va a crear', async () => {
    agenda.getDisponibilidad.mockRejectedValueOnce(new ApiError(404, 'Property not found'))
    await montar('prop-1')

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
  })

  it('si el back explica por qué no guardó, el toast lo dice (F12)', async () => {
    agenda.getDisponibilidad.mockResolvedValueOnce({ windows: [], agendas: null, visitTypes: [] })
    agenda.setDisponibilidad.mockRejectedValueOnce(
      new ApiError(409, 'Esa franja se cruza con una visita ya agendada.'),
    )
    await montar('prop-1')

    await act(async () => {
      ;(container.querySelector('[data-testid="visitas-interruptor"]') as HTMLElement).click()
    })
    await tick()

    expect(agenda.setDisponibilidad).toHaveBeenCalledTimes(1)
    expect(toastMock.error).toHaveBeenCalledWith('No pudimos guardar los horarios', {
      description: 'Esa franja se cruza con una visita ya agendada.',
    })
  })

  it('un 500 al guardar no pinta «Internal server error»: queda el «intenta de nuevo»', async () => {
    agenda.getDisponibilidad.mockResolvedValueOnce({ windows: [], agendas: null, visitTypes: [] })
    agenda.setDisponibilidad.mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
    await montar('prop-1')

    await act(async () => {
      ;(container.querySelector('[data-testid="visitas-interruptor"]') as HTMLElement).click()
    })
    await tick()

    expect(toastMock.error).toHaveBeenCalledWith('No pudimos guardar los horarios', {
      description: 'Intenta de nuevo en unos segundos.',
    })
  })
})
