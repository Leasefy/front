import { describe, expect, it } from 'vitest'

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
