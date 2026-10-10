import { describe, expect, it } from 'vitest'

import type { InmuebleParaElegir } from '@/lib/api/marketplace-del-portafolio.service'
import { loQueHacenLosBotones } from './MarketplaceDeLosMarcados'

function inmueble(id: string, o: Partial<InmuebleParaElegir> = {}): InmuebleParaElegir {
  return {
    id,
    titulo: id,
    direccion: null,
    ciudad: null,
    barrio: null,
    canonCop: null,
    venta: false,
    fotos: 3,
    publicado: false,
    seVe: false,
    porQueNoSeVe: null,
    ...o,
  }
}

describe('loQueHacenLosBotones', () => {
  const porInmueble = {
    a: inmueble('a'),
    b: inmueble('b', { publicado: true, seVe: true }),
    c: inmueble('c', { fotos: 0, porQueNoSeVe: 'Está arrendado: sale cuando quede disponible.' }),
  }

  it('publicar toca sólo los no publicados y quitar sólo los publicados', () => {
    const r = loQueHacenLosBotones(new Set(['a', 'b', 'c']), porInmueble)
    expect(r.porPublicar).toEqual(['a', 'c'])
    expect(r.porQuitar).toEqual(['b'])
  })

  it('cuenta los que todavía no saldrían y los que no tienen fotos', () => {
    const r = loQueHacenLosBotones(new Set(['a', 'c']), porInmueble)
    expect(r.noSaldrianTodavia).toBe(1)
    expect(r.sinFotos).toBe(1)
  })

  it('un marcado que no está en la lista no se manda', () => {
    const r = loQueHacenLosBotones(new Set(['a', 'zzz']), porInmueble)
    expect(r.porPublicar).toEqual(['a'])
    expect(r.porQuitar).toEqual([])
  })
})
