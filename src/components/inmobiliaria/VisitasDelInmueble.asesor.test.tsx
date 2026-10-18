/**
 * @vitest-environment happy-dom
 *
 * IMANA-3 (QA de agentes 17-10): la ficha decía «Nadie puede agendar una visita
 * a este inmueble» mientras el aviso ofrecía los cupos de la asesora a cargo
 * (su horario manda sobre el del inmueble). Ahora la tarjeta dice cuál rige.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { agenda } = vi.hoisted(() => ({
  agenda: { getDisponibilidad: vi.fn(), setDisponibilidad: vi.fn() },
}))
vi.mock('@/lib/api/agenda.service', () => ({ agendaApi: agenda }))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('@/components/panel/AvailabilityScheduleEditor', () => ({ AvailabilityScheduleEditor: () => null }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}))

import { VisitasDelInmueble } from './VisitasDelInmueble'

const tick = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })

const ANA = {
  userId: 'u-ana',
  memberId: 'm-ana',
  nombre: 'Ana Administradora',
  ventanas: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00', slotDuration: 60 })),
}

describe('<VisitasDelInmueble> — el horario de la asesora a cargo manda', () => {
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

  async function montar() {
    act(() => {
      root.render(<VisitasDelInmueble propertyId="prop-1" />)
    })
    await tick()
  }

  it('sin horarios del inmueble pero con los de la asesora: se pueden agendar, con su horario (nunca «Nadie puede agendar»)', async () => {
    agenda.getDisponibilidad.mockResolvedValueOnce({ windows: [], agendas: null, visitTypes: [], delAsesor: ANA })
    await montar()

    const resumen = container.querySelector('[data-testid="visitas-resumen"]')?.textContent ?? ''
    expect(resumen).toBe('Se pueden agendar · horario de Ana Administradora: Lun · Mar · Mié · Jue · Vie')
    expect(container.textContent).not.toContain('Nadie puede agendar')
    // El interruptor del inmueble no decide nada mientras rige el de la asesora.
    expect(container.querySelector('[data-testid="visitas-interruptor"]')).toBeNull()
    const enlace = container.querySelector('[data-testid="visitas-cambiar-horario-del-asesor"]')
    expect(enlace?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/equipo/m-ana')
    expect(enlace?.textContent).toBe('Cambiar el horario de Ana Administradora')
  })

  it('con horarios del inmueble también, dice que ésos no se usan', async () => {
    agenda.getDisponibilidad.mockResolvedValueOnce({
      windows: [{ dayOfWeek: 6, startTime: '10:00', endTime: '12:00', slotDuration: 30 }],
      agendas: null,
      visitTypes: ['IN_PERSON'],
      delAsesor: ANA,
    })
    await montar()
    expect(container.querySelector('[data-testid="visitas-del-asesor"]')?.textContent).toContain(
      'Los horarios propios del inmueble no se usan mientras tenga ese horario.',
    )
  })

  it('sin asesor con horario, como siempre: el interruptor del inmueble', async () => {
    agenda.getDisponibilidad.mockResolvedValueOnce({ windows: [], agendas: null, visitTypes: [], delAsesor: null })
    await montar()
    expect(container.querySelector('[data-testid="visitas-resumen"]')?.textContent).toBe(
      'Nadie puede agendar una visita a este inmueble',
    )
    expect(container.querySelector('[data-testid="visitas-interruptor"]')).not.toBeNull()
  })
})
