/**
 * QA de los agentes (19-10-2026): el cotizador habla con nombres, no con códigos.
 */
import { describe, it, expect } from 'vitest'

import { nombreDeLaAseguradora } from './nombre-de-la-aseguradora'
import { tipoDeInmuebleEnPalabras, tipoQueViaja, TIPOS_DE_INMUEBLE_DEL_COTIZADOR } from './tipo-de-inmueble'
import { aseguradorasQueSePuedenElegir } from './aseguradoras-que-se-pueden-elegir'
import type { RegistryResponse } from '@/lib/hooks/cotizador/use-carrier-registry'

describe('nombreDeLaAseguradora', () => {
  it('Bolívar con tilde, y los demás con su nombre', () => {
    expect(nombreDeLaAseguradora('bolivar')).toBe('Bolívar')
    expect(nombreDeLaAseguradora('BOLIVAR')).toBe('Bolívar')
    expect(nombreDeLaAseguradora('estado')).toBe('Seguros del Estado')
    expect(nombreDeLaAseguradora('nueva')).toBe('Nueva')
    expect(nombreDeLaAseguradora('')).toBe('la aseguradora')
  })
})

describe('el tipo de inmueble', () => {
  it('COTIZ-5: lo comercial es «Local u oficina» y ya no se ofrece «oficina» aparte', () => {
    expect(TIPOS_DE_INMUEBLE_DEL_COTIZADOR).toEqual(['apartamento', 'casa', 'local'])
    expect(tipoDeInmuebleEnPalabras('local')).toBe('Local u oficina')
    expect(tipoDeInmuebleEnPalabras('oficina')).toBe('Local u oficina')
    expect(tipoQueViaja('oficina')).toBe('local')
  })

  it('COTIZ-7: con mayúscula, nunca el código', () => {
    expect(tipoDeInmuebleEnPalabras('apartamento')).toBe('Apartamento')
    expect(tipoDeInmuebleEnPalabras('casa')).toBe('Casa')
    expect(tipoDeInmuebleEnPalabras(null)).toBe('')
  })
})

describe('aseguradorasQueSePuedenElegir', () => {
  const fila = (name: string, route: string, enabled: boolean) => ({
    name, route, enabled, mode: 'stub' as const, priority: 10, maxCanonCop: null, breachStatus: 'healthy' as const,
  })
  const registro: RegistryResponse = {
    global: [fila('sura', 'sekure', false), fila('sura', 'direct', true), fila('mapfre', 'direct', true), fila('bolivar', 'direct', true), fila('fianly', 'direct', false)],
    overrides: [
      { name: 'mapfre', route: 'direct', enabled: false, priority: null, mode: null, maxCanonCop: null },
      { name: 'fianly', route: 'direct', enabled: true, priority: null, mode: null, maxCanonCop: null },
    ],
  }

  it('las habilitadas para ESTA inmobiliaria, una vez cada una y con su nombre', () => {
    expect(aseguradorasQueSePuedenElegir(registro)).toEqual([
      { codigo: 'bolivar', nombre: 'Bolívar' },
      { codigo: 'fianly', nombre: 'Fianly' },
      { codigo: 'sura', nombre: 'Sura' },
    ])
  })

  it('sin registro, nada', () => {
    expect(aseguradorasQueSePuedenElegir(null)).toEqual([])
  })
})

import { deriveCarrierLabelsForSet } from './carrier-labels'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

describe('COTIZ-14: las etiquetas comparativas', () => {
  const c = (carrier: string, status: CarrierState['status'], primaMensualCop: number | null, latencyMs: number): CarrierState => ({
    carrier, status, primaMensualCop, condiciones: [], motivoRechazo: null, latencyMs, isStub: true, startedAtMs: null,
  })
  it('con una sola aprobada no hay «más rápida» ni «menor costo»', () => {
    const m = deriveCarrierLabelsForSet([c('mapfre', 'approved', 138_700, 348), c('sura', 'rejected', null, 297)])
    expect(m.get('mapfre')).not.toContain('mas_rapida')
    expect(m.get('mapfre')).not.toContain('menor_costo')
  })
  it('con dos, sí: la de menor tiempo y la de menor prima', () => {
    const m = deriveCarrierLabelsForSet([c('mapfre', 'approved', 138_700, 348), c('sura', 'approved', 120_000, 500)])
    expect(m.get('mapfre')).toContain('mas_rapida')
    expect(m.get('sura')).toContain('menor_costo')
  })
})
