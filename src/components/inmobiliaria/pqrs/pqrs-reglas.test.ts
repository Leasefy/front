/**
 * Reglas puras de las PQRS: qué falta para radicar, a dónde se puede mover
 * cada estado y cómo se lee el SLA.
 */
import { describe, it, expect } from 'vitest'
import { diasParaElSla, PQRS_ESTADOS } from '@/lib/api/pqrs-agencia.types'
import { validarPqrs } from './NuevaPqrsDrawer'
import { estadosSiguientes } from './PqrsDrawer'
import { PQRS_FORMULARIO_VACIO, textoSla } from './pqrs-reglas'

const DIA = 24 * 60 * 60 * 1000
const ahora = new Date('2026-09-03T15:00:00Z')
const en = (dias: number) => new Date(ahora.getTime() + dias * DIA).toISOString()

describe('validarPqrs', () => {
  it('vacío: faltan el nombre y el asunto', () => {
    expect(Object.keys(validarPqrs(PQRS_FORMULARIO_VACIO)).sort()).toEqual(['asunto', 'solicitanteNombre'])
  })
  it('los espacios no cuentan como escrito', () => {
    expect(validarPqrs({ ...PQRS_FORMULARIO_VACIO, solicitanteNombre: '   ', asunto: ' ' })).toHaveProperty('asunto')
  })
  it('con nombre y asunto se puede radicar; lo demás es opcional', () => {
    expect(validarPqrs({ ...PQRS_FORMULARIO_VACIO, solicitanteNombre: 'Camila', asunto: 'Gotera' })).toEqual({})
  })
  it('topa el asunto en 200 y la descripción en 2000', () => {
    const base = { ...PQRS_FORMULARIO_VACIO, solicitanteNombre: 'C' }
    expect(validarPqrs({ ...base, asunto: 'x'.repeat(201) })).toHaveProperty('asunto')
    expect(validarPqrs({ ...base, asunto: 'x'.repeat(200) })).toEqual({})
    expect(validarPqrs({ ...base, asunto: 'ok', descripcion: 'x'.repeat(2001) })).toHaveProperty('descripcion')
  })
})

describe('estadosSiguientes', () => {
  it('desde los estados abiertos se puede ir a proceso, cotización, resuelta o cerrada (menos a sí mismo)', () => {
    expect(estadosSiguientes('RECIBIDA')).toEqual(['EN_PROCESO', 'EN_COTIZACION', 'RESUELTA', 'CERRADA'])
    expect(estadosSiguientes('ASIGNADA')).toEqual(['EN_PROCESO', 'EN_COTIZACION', 'RESUELTA', 'CERRADA'])
    expect(estadosSiguientes('EN_PROCESO')).toEqual(['EN_COTIZACION', 'RESUELTA', 'CERRADA'])
    expect(estadosSiguientes('EN_COTIZACION')).toEqual(['EN_PROCESO', 'RESUELTA', 'CERRADA'])
  })
  it('resuelta sólo se cierra; cerrada no va a ningún lado', () => {
    expect(estadosSiguientes('RESUELTA')).toEqual(['CERRADA'])
    expect(estadosSiguientes('CERRADA')).toEqual([])
  })
  it('nunca ofrece «Asignada» ni «Recibida» a mano', () => {
    for (const e of PQRS_ESTADOS) {
      expect(estadosSiguientes(e)).not.toContain('ASIGNADA')
      expect(estadosSiguientes(e)).not.toContain('RECIBIDA')
    }
  })
})

describe('diasParaElSla', () => {
  it('cuenta días calendario hacia arriba', () => {
    expect(diasParaElSla(en(3), ahora)).toBe(3)
    expect(diasParaElSla(en(2.2), ahora)).toBe(3)
    expect(diasParaElSla(en(0), ahora)).toBe(0)
    expect(diasParaElSla(en(-1), ahora)).toBe(-1)
    expect(diasParaElSla(en(-1.5), ahora)).toBe(-1)
  })
})

describe('textoSla', () => {
  it('faltan días, hoy, o vencido hace N', () => {
    expect(textoSla(en(3), 'RECIBIDA', ahora)).toEqual({ texto: '3 días', vencido: false })
    expect(textoSla(en(1), 'EN_PROCESO', ahora)).toEqual({ texto: '1 día', vencido: false })
    expect(textoSla(en(0), 'ASIGNADA', ahora)).toEqual({ texto: 'Hoy', vencido: true })
    expect(textoSla(en(-1), 'EN_COTIZACION', ahora)).toEqual({ texto: 'Vencido hace 1 día', vencido: true })
    expect(textoSla(en(-4), 'RECIBIDA', ahora)).toEqual({ texto: 'Vencido hace 4 días', vencido: true })
  })
  it('resuelta o cerrada ya no corren', () => {
    expect(textoSla(en(-10), 'RESUELTA', ahora)).toEqual({ texto: '—', vencido: false })
    expect(textoSla(en(-10), 'CERRADA', ahora)).toEqual({ texto: '—', vencido: false })
  })
})
