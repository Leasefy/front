import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn() } }))

import { puestosPorPostulacion } from './listas-cortas.service'

describe('la lista corta por postulación (MANOS-2)', () => {
  it('sólo quien tiene puesto; los de afuera no se marcan', () => {
    const m = puestosPorPostulacion({
      'p-1': {
        hechaEl: '2026-10-05T15:00:00.000Z',
        quien: 'El Piloto (Automático)',
        lista: [
          { applicationId: 'a', nombre: 'Ana', puesto: 1, razones: ['Su estudio respalda el canon.'], fuera: null },
          { applicationId: 'b', nombre: 'Bruno', puesto: null, razones: [], fuera: 'Su estudio respalda hasta $ 1.500.000…' },
        ],
      },
      'p-2': { hechaEl: '2026-10-05T15:00:00.000Z', quien: null, lista: [{ applicationId: 'c', nombre: 'Carla', puesto: 2, razones: [], fuera: null }] },
    })
    expect([...m.keys()].sort()).toEqual(['a', 'c'])
    expect(m.get('c')?.puesto).toBe(2)
  })
})

describe('la lista corta de UN inmueble (MATCH-3)', () => {
  it('con lista, los puestos de ese inmueble; sin lista, vacío', async () => {
    const { listasCortasApi } = await import('./listas-cortas.service')
    const { apiClient } = await import('@/lib/api/client')
    const get = apiClient.get as unknown as { mockResolvedValueOnce: (v: unknown) => void }
    get.mockResolvedValueOnce({
      listaCorta: { hechaEl: '2026-10-18T07:15:00.000Z', quien: 'Ana', lista: [{ applicationId: 'a', nombre: 'Ana', puesto: 1, razones: [], fuera: null }] },
    })
    expect([...(await listasCortasApi.puestosDelInmueble('p-1')).keys()]).toEqual(['a'])
    get.mockResolvedValueOnce({ listaCorta: null })
    expect((await listasCortasApi.puestosDelInmueble('p-1')).size).toBe(0)
  })
})
