import { describe, expect, it } from 'vitest'
import {
  avanceDeLaPqrs,
  avanceDelMantenimiento,
  avanceDeLaSolicitudDelPortal,
} from './avance-de-la-solicitud'

describe('avanceDeLaSolicitudDelPortal', () => {
  it('una reparación que ya está en el tablero sigue a su tarjeta, no a la PQRS', () => {
    // La PQRS sigue «recibida», pero la inmobiliaria ya la movió a «En arreglo».
    const a = avanceDeLaSolicitudDelPortal('recibida', true, { estado: 'in_progress', iba: 'approved' })
    expect(a.pasos[a.actual].nombre).toBe('En arreglo')
    expect(a.detenida).toBeNull()
  })

  it('cancelada en el tablero se queda donde iba y dice «No aprobada»', () => {
    const a = avanceDeLaSolicitudDelPortal('asignada', true, { estado: 'cancelled', iba: 'quoted' })
    expect(a.pasos[a.actual].clave).toBe('quoted')
    expect(a.detenida).toBe('No aprobada')
  })

  it('sin tarjeta (o con un back anterior) manda la PQRS, como antes', () => {
    expect(avanceDeLaSolicitudDelPortal('en_proceso', true, null)).toEqual(avanceDeLaPqrs('en_proceso', true))
    expect(avanceDeLaSolicitudDelPortal('recibida', false)).toEqual(avanceDeLaPqrs('recibida', false))
  })

  it('terminada llena la barra hasta el final', () => {
    const a = avanceDelMantenimiento('completed')
    expect(a.actual).toBe(a.pasos.length - 1)
  })
})
