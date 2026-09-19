/**
 * 🔴 Un vencimiento no es una tarea (Nico, 18-09-2026).
 *
 * El cajón abría con el rótulo «QUÉ HACES CON ESTA TAREA» encima de la nada:
 * un vencimiento de contrato lo deriva el sistema, no tiene botones, y además
 * `hrefDelVinculo` no lo cubría, así que tampoco ofrecía el camino a su ficha.
 * La persona abría el detalle y se encontraba con un callejón.
 */
import { describe, it, expect } from 'vitest'

import { hrefDelVinculo, tieneAcciones } from './EventoAgendaDrawer'
import type { EventoAgenda } from '@/lib/api/agenda.types'

const VENCIMIENTO: EventoAgenda = {
  id: 'expire-c1',
  tipo: 'vencimiento_contrato',
  origen: 'sistema',
  estado: 'vencido',
  titulo: 'Vence el contrato · Apartamento en Centro, Caldas',
  fecha: '2024-09-30T00:00:00',
  vinculoTipo: 'contrato',
  vinculoId: 'lease-1',
  vinculoLabel: 'Apartamento en Centro, Caldas',
}

describe('un vencimiento en la agenda', () => {
  it('🔴 lleva a su contrato: antes se quedaba sin enlace', () => {
    expect(hrefDelVinculo(VENCIMIENTO)).toBe('/panel/inmobiliaria/contratos/lease-1')
  })

  it('no ofrece acciones: no se marca ni se cancela desde la agenda', () => {
    expect(tieneAcciones(VENCIMIENTO)).toBe(false)
  })

  it('una tarea y una visita sí las ofrecen', () => {
    expect(tieneAcciones({ ...VENCIMIENTO, tipo: 'tarea' })).toBe(true)
    expect(tieneAcciones({ ...VENCIMIENTO, tipo: 'visita' })).toBe(true)
  })

  it('una visita NO lleva enlace: su vínculo es el propertyId, que no abre ficha', () => {
    expect(
      hrefDelVinculo({ ...VENCIMIENTO, tipo: 'visita', vinculoTipo: 'propiedad' }),
    ).toBeNull()
  })

  it('una inspección lleva al inmueble', () => {
    expect(
      hrefDelVinculo({
        ...VENCIMIENTO,
        tipo: 'inspeccion',
        vinculoTipo: 'propiedad',
        vinculoId: 'cons-9',
      }),
    ).toBe('/panel/inmobiliaria/inmuebles/cons-9')
  })
})
