/**
 * RP1 (auditoría de casos de error 13-09): el período elegido en Reportes no
 * viajaba al archivo — cada tarjeta bajaba el default del back.
 *
 * Lo que se fija: que cada tipo mande el parámetro que el back SÍ acepta
 * (`reports.service.ts#exportCsv`), y que la nota no finja haber aplicado un
 * período en los reportes que no lo aceptan.
 */

import { describe, it, expect } from 'vitest'
import { parametrosDelPeriodo, rutaDeExport } from './exportables'

const agosto = { start: '2026-08-01', end: '2026-08-31' }
const junioAAgosto = { start: '2026-06-01', end: '2026-08-31' }

describe('parametrosDelPeriodo', () => {
  it('🔴 rentabilidad manda desde/hasta en meses, y la ruta los lleva', () => {
    const { params, nota } = parametrosDelPeriodo('rentabilidad-inmueble', junioAAgosto)
    expect(params).toEqual({ desde: '2026-06', hasta: '2026-08' })
    expect(rutaDeExport('rentabilidad-inmueble', params)).toBe(
      '/inmobiliaria/reports/export?type=rentabilidad-inmueble&desde=2026-06&hasta=2026-08',
    )
    expect(nota).toBe('De 2026-06 a 2026-08.')
  })

  it('🔴 comisiones manda UN mes; si el período abarca más, lo dice en vez de callarlo', () => {
    expect(parametrosDelPeriodo('comisiones-agente', agosto)).toEqual({
      params: { month: '2026-08' },
      nota: 'Del mes 2026-08.',
    })
    const largo = parametrosDelPeriodo('comisiones-agente', junioAAgosto)
    expect(largo.params).toEqual({ month: '2026-06' })
    expect(largo.nota).toContain('sale de a un mes')
  })

  it.each(['cartera-edades', 'vencimientos', 'ocupacion-portafolio'] as const)(
    '%s es la foto de hoy: no manda fechas y lo dice',
    (tipo) => {
      const r = parametrosDelPeriodo(tipo, agosto)
      expect(r.params).toEqual({})
      expect(r.nota).toContain('foto de hoy')
    },
  )

  it('flujo de caja no acepta fechas: no finge que aplicó el período', () => {
    const r = parametrosDelPeriodo('flujo-caja', agosto)
    expect(r.params).toEqual({})
    expect(r.nota).toContain('no aplica')
    expect(r.nota).toContain('6 meses')
  })

  it('sin período, o con una fecha que no se lee, no inventa uno', () => {
    expect(parametrosDelPeriodo('rentabilidad-inmueble', null).params).toEqual({})
    expect(parametrosDelPeriodo('comisiones-agente', { start: '', end: '' }).params).toEqual({})
  })
})
