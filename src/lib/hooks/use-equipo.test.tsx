/**
 * El agente que acabás de invitar tiene que aparecer en la tabla.
 *
 * `GET /inmobiliaria/agentes` sólo devuelve miembros ACTIVE y con usuario
 * vinculado, así que una invitación recién creada (INVITED, sin usuario) no
 * sale ahí NUNCA: la pantalla decía «0 agentes · No hay agentes registrados»
 * arriba de un agente que sí existía en base. `useEquipo` junta las dos
 * fuentes; estos tests son los que impiden que se vuelva a separar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getAllAgentes = vi.fn()
const getUsers = vi.fn()

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agentesApi: { getAll: () => getAllAgentes() },
  inmobiliariaConfigApi: { getUsers: () => getUsers() },
  // El módulo entero se mockea, así que hay que declarar lo que useInmobiliaria
  // importa aunque estos tests no lo usen.
  propietariosApi: {}, consignacionesApi: {}, pipelineApi: {}, cobrosApi: {},
  avaluosApi: {}, dispersionesApi: {}, mantenimientoApi: {}, renovacionesApi: {},
  reportesApi: {}, analyticsApi: {}, aiApi: {}, documentosApi: {}, actasApi: {},
  inmobiliariaDashboardApi: {},
}))

import { useEquipo } from './useInmobiliaria'
import { ApiError } from '@/lib/api/client'

const AGENTE_ACTIVO = {
  id: 'agente-1',
  name: 'Ana Ruiz',
  email: 'ana@inmo.co',
  phone: '3001234567',
  role: 'agent',
  status: 'active',
  commissionSplit: 50,
  assignedPropertyIds: [],
  hireDate: '2026-01-01T00:00:00.000Z',
  metrics: {
    assignedProperties: 3, activeLeases: 2, closedThisMonth: 1, closedThisYear: 4,
    totalCommissions: 100, commissionsThisMonth: 10, avgDaysToClose: 12, conversionRate: 0.3,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MIEMBRO_INVITADO = {
  id: 'member-9',
  email: 'nuevo@prueba.com',
  name: 'nuevo@prueba.com',
  role: 'agente',
  status: 'invited',
  invitedAt: '2026-08-12T17:04:19.000Z',
  createdAt: '2026-08-12T17:04:19.000Z',
}

describe('useEquipo', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: ReturnType<typeof useEquipo> | null } = { current: null }

  function Sonda() {
    result.current = useEquipo()
    return null
  }

  async function montar() {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => { root.render(<Sonda />) })
  }

  beforeEach(() => {
    getAllAgentes.mockReset()
    getUsers.mockReset()
    result.current = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('el agente recién invitado aparece en la lista, aunque /agentes venga vacío', async () => {
    getAllAgentes.mockResolvedValue([])
    getUsers.mockResolvedValue([MIEMBRO_INVITADO])

    await montar()

    const agentes = result.current!.agentes
    expect(agentes).toHaveLength(1)
    expect(agentes[0].email).toBe('nuevo@prueba.com')
    expect(agentes[0].status).toBe('invited')
    // Sin métricas inventadas: no cerró nada porque todavía no entró.
    expect(agentes[0].metrics.closedThisMonth).toBe(0)
  })

  it('junta activos e invitados sin pisar las métricas del activo', async () => {
    getAllAgentes.mockResolvedValue([AGENTE_ACTIVO])
    getUsers.mockResolvedValue([MIEMBRO_INVITADO])

    await montar()

    const agentes = result.current!.agentes
    expect(agentes).toHaveLength(2)
    expect(agentes.find((a) => a.id === 'agente-1')!.metrics.closedThisMonth).toBe(1)
    expect(agentes.filter((a) => a.status === 'invited')).toHaveLength(1)
  })

  it('ignora a los miembros que no son agentes y a los que ya aceptaron', async () => {
    getAllAgentes.mockResolvedValue([])
    getUsers.mockResolvedValue([
      { ...MIEMBRO_INVITADO, id: 'm-admin', role: 'admin' },
      { ...MIEMBRO_INVITADO, id: 'm-activo', status: 'active' },
      MIEMBRO_INVITADO,
    ])

    await montar()

    expect(result.current!.agentes.map((a) => a.id)).toEqual(['member-9'])
  })

  it('un 403 en las invitaciones NO es un fallo: es que no le corresponde verlas', async () => {
    getAllAgentes.mockResolvedValue([AGENTE_ACTIVO])
    getUsers.mockRejectedValue(new ApiError(403, 'Forbidden'))

    await montar()

    expect(result.current!.agentes).toHaveLength(1)
    expect(result.current!.error).toBeNull()
    expect(result.current!.invitacionesCaidas).toBe(false)
  })

  it('cualquier otro fallo de las invitaciones sí se avisa: falta gente', async () => {
    getAllAgentes.mockResolvedValue([AGENTE_ACTIVO])
    getUsers.mockRejectedValue(new ApiError(500, 'boom'))

    await montar()

    expect(result.current!.agentes).toHaveLength(1)
    expect(result.current!.invitacionesCaidas).toBe(true)
  })

  it('si se cae /agentes el hook falla de verdad, no muestra media lista', async () => {
    getAllAgentes.mockRejectedValue(new ApiError(500, 'boom'))
    getUsers.mockResolvedValue([MIEMBRO_INVITADO])

    await montar()

    expect(result.current!.agentes).toEqual([])
    expect(result.current!.errorCrudo).toBeInstanceOf(ApiError)
  })
})
