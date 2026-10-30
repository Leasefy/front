import { describe, expect, it } from 'vitest'

import { amenidadesPorGrupo } from './FichaDelInmueble'
import type { Property } from '@/lib/types/property'

const con = (amenities: Array<{ id: string; name: string }>) => ({ amenities }) as unknown as Property

describe('amenidadesPorGrupo (la ficha del panel, 27-10-2026)', () => {
  it('agrupa como el formulario: del inmueble, del conjunto y del sector, en ese orden', () => {
    const g = amenidadesPorGrupo(con([{ id: 'balcony', name: 'Balcón' }, { id: 'furnished', name: 'Amoblado' }]))
    expect(g).toEqual([{ grupo: 'inmueble', nombres: ['Amoblado', 'Balcón'] }])
  })
  it('una que no está en el catálogo va con las del inmueble, con su nombre', () => {
    expect(amenidadesPorGrupo(con([{ id: 'x-1', name: 'Chimenea' }]))).toEqual([{ grupo: 'inmueble', nombres: ['Chimenea'] }])
  })
  it('sin amenidades, nada', () => {
    expect(amenidadesPorGrupo(con([]))).toEqual([])
    expect(amenidadesPorGrupo({} as Property)).toEqual([])
  })
})
