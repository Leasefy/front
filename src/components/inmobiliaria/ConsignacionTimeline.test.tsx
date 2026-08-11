/**
 * La línea de tiempo de una consignación no inventa historia.
 *
 * Antes GENERABA diez eventos a partir de una sola fecha guardada:
 *
 *   «Agente asignado»       = contractDate + 1 día
 *   «Propiedad publicada»   = contractDate + 3
 *   «Visita agendada»       = contractDate + 7
 *   «Visita completada»     = contractDate + 8
 *   «Segunda visita»        = contractDate + 12 y +13
 *   «Candidato aprobado»    = leaseEndDate − 1 año + 14 días, atribuido al
 *                             SISTEMA DE SCORING, con el nombre real del inquilino
 *   «Contrato firmado»      = eso + 5 días, con el inquilino como actor
 *   «Entrega completada»    = eso + 3 días
 *
 * Ninguno ocurrió. Y se veían idénticos a un evento real: mismo icono, misma
 * fecha con formato, mismo «hecho por». Una pantalla que dice que una persona
 * con nombre y apellido hizo algo un día concreto está afirmando un hecho; si
 * el hecho salió de una suma de días, es falso.
 *
 * Ahora hay dos fuentes y las dos son reales: los hitos guardados en el propio
 * registro (sin aritmética) y los eventos de la agenda vinculados a esta
 * propiedad.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
    formatDate: (d: string) => d,
    formatRelativeDate: (d: string) => d,
    locale: 'es',
  }),
}))

const getAgendaMock = vi.fn()
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: { getAgenda: () => getAgendaMock() },
}))

import { ConsignacionTimeline } from './ConsignacionTimeline'
import type { Consignacion } from '@/lib/types/inmobiliaria'

const CONSIGNACION = {
  id: 'c-1',
  propertyId: 'prop-1',
  propietarioId: 'own-1',
  agenteId: 'ag-1',
  propertyTitle: 'Apto 101',
  propertyAddress: 'Calle 1',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'apartment',
  monthlyRent: 2500000,
  commissionPercent: 10,
  // Hace más de un año: con el generador viejo esto disparaba las 4 visitas.
  contractDate: '2024-01-10',
  status: 'active',
  availability: 'rented',
  currentTenantName: 'María Pérez',
  leaseEndDate: '2026-12-31',
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
} as unknown as Consignacion

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getAgendaMock.mockResolvedValue({ eventos: [], resumen: {} })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar(consignacion: Consignacion = CONSIGNACION) {
  await act(async () => {
    root.render(React.createElement(ConsignacionTimeline, { consignacion, agenteName: 'Ana Gómez' }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('no se inventan eventos', () => {
  it('sin nada en la agenda, sólo salen los hitos guardados', async () => {
    await montar()
    const texto = container.textContent ?? ''

    // Estos existían sólo porque se calculaban.
    expect(texto).not.toContain('agentAssigned')
    expect(texto).not.toContain('propertyPublished')
    expect(texto).not.toContain('visitScheduled')
    expect(texto).not.toContain('visitCompleted')
    expect(texto).not.toContain('candidateApproved')
    expect(texto).not.toContain('handoverCompleted')
  })

  it('el sistema de scoring no aparece aprobando a nadie', async () => {
    await montar()
    expect(container.textContent).not.toContain('scoringSystem')
  })

  it('los hitos que SÍ están guardados se muestran', async () => {
    await montar()
    const texto = container.textContent ?? ''
    expect(texto).toContain('consignacionCreated')
    expect(texto).toContain('leaseEnds')
  })
})

describe('los eventos reales de la agenda sí entran', () => {
  it('sólo los vinculados a ESTA propiedad', async () => {
    getAgendaMock.mockResolvedValue({
      eventos: [
        {
          id: 'e1',
          tipo: 'visita',
          origen: 'sistema',
          estado: 'completado',
          titulo: 'Visita con interesado',
          fecha: '2026-08-01T15:00:00Z',
          vinculoTipo: 'propiedad',
          vinculoId: 'prop-1',
          responsableNombre: 'Ana Gómez',
        },
        {
          id: 'e2',
          tipo: 'visita',
          origen: 'sistema',
          estado: 'completado',
          titulo: 'Visita de otro inmueble',
          fecha: '2026-08-02T15:00:00Z',
          vinculoTipo: 'propiedad',
          vinculoId: 'prop-999',
        },
      ],
      resumen: {},
    })

    await montar()
    const texto = container.textContent ?? ''
    expect(texto).toContain('Visita con interesado')
    expect(texto).not.toContain('Visita de otro inmueble')
  })
})

describe('los tres estados que antes no existían', () => {
  it('sin hitos ni eventos: lo dice, no dibuja una historia', async () => {
    const sinFechas = { ...CONSIGNACION, contractDate: '', leaseEndDate: undefined } as Consignacion
    await montar(sinFechas)
    expect(container.querySelector('[data-testid="timeline-sin-actividad"]')).not.toBeNull()
  })

  it('si la agenda falla, lo avisa y conserva los hitos del registro', async () => {
    getAgendaMock.mockRejectedValue(new Error('boom'))
    await montar()

    expect(container.querySelector('[data-testid="timeline-fallo-agenda"]')).not.toBeNull()
    // El hito guardado no depende de la agenda: sigue ahí.
    expect(container.textContent).toContain('consignacionCreated')
  })
})
