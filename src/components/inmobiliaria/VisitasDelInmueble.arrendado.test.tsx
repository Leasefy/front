/**
 * @vitest-environment happy-dom
 *
 * IN-10 (QA 04-10): en un inmueble ARRENDADO el interruptor «Visitas» guardaba
 * de una lunes a sábado sin avisar que está ocupado. Ahora pregunta antes y
 * nada se guarda sin confirmar.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

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

describe('<VisitasDelInmueble> en un inmueble arrendado (IN-10)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    agenda.getDisponibilidad.mockResolvedValue({ windows: [], agendas: null, visitTypes: [] })
    agenda.setDisponibilidad.mockResolvedValue({})
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function montar(props: { arrendado?: boolean; arrendadoHasta?: string | null }) {
    act(() => {
      root.render(<VisitasDelInmueble propertyId="prop-1" {...props} />)
    })
    await tick()
  }
  const prender = async () => {
    await act(async () => {
      ;(container.querySelector('[data-testid="visitas-interruptor"]') as HTMLElement).click()
    })
    await tick()
  }

  it('🔴 prender NO guarda: avisa hasta cuándo está arrendado y pregunta', async () => {
    await montar({ arrendado: true, arrendadoHasta: '2026-10-31' })
    await prender()
    expect(agenda.setDisponibilidad).not.toHaveBeenCalled()
    const dialogo = document.querySelector('[data-testid="visitas-arrendado"]')
    expect(dialogo?.textContent).toContain('arrendado')
    expect(dialogo?.textContent).toContain('31 de octubre de 2026')
  })

  it('al confirmar, abre los horarios', async () => {
    await montar({ arrendado: true, arrendadoHasta: '2026-10-31' })
    await prender()
    await act(async () => {
      ;(document.querySelector('[data-testid="visitas-arrendado-confirmar"]') as HTMLElement).click()
    })
    await tick()
    expect(agenda.setDisponibilidad).toHaveBeenCalled()
  })

  it('un inmueble disponible guarda como siempre, sin preguntar', async () => {
    await montar({ arrendado: false })
    await prender()
    expect(document.querySelector('[data-testid="visitas-arrendado"]')).toBeNull()
    expect(agenda.setDisponibilidad).toHaveBeenCalled()
  })
})
