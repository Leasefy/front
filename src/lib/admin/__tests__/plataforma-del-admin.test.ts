import { describe, expect, it } from 'vitest'

import { aFecha, fmtDiaCorto, fmtPorcentaje } from '../format'
import { pasaLosFiltros, type InmobiliariaDeLaLista } from '../inmobiliarias-de-la-lista'
import { dioElPaso, loQueLeFalta, type RecorridoDeLaInmobiliaria } from '../recorrido-de-la-inmobiliaria'

/** QA del admin (19-10-2026): la lista de inmobiliarias, el recorrido del onboarding y los formatos. */

const fila = (cambios: Partial<InmobiliariaDeLaLista> = {}): InmobiliariaDeLaLista => ({
  agency_id: 'a1',
  tenant_id: 'a1',
  legal_name: 'Portofino Propiedad Raíz',
  nombre: 'Portofino Propiedad Raíz',
  nit: '901548190-1',
  ciudad: 'Medellín',
  correo: 'hola@portofino.co',
  billing_model: null,
  primary_contact_email: null,
  created_at: '2026-10-14T18:15:00Z',
  debtor_count: 0,
  call_count: 0,
  paid_total: null,
  en_cobranza_por_voz: true,
  plan: { tier: 'ultra', nombre: 'Ultra', estado: 'ACTIVE', modo: 'FLAT', fin_del_periodo: null },
  ...cambios,
})

describe('pasaLosFiltros', () => {
  const sinFiltros = { q: '', plan: '', voz: '' }

  it('busca por palabras, sin tildes y en cualquier orden (nombre, NIT, ciudad o correo)', () => {
    expect(pasaLosFiltros(fila(), { ...sinFiltros, q: 'raiz portofino' })).toBe(true)
    expect(pasaLosFiltros(fila(), { ...sinFiltros, q: 'medellin' })).toBe(true)
    expect(pasaLosFiltros(fila(), { ...sinFiltros, q: '901548190' })).toBe(true)
    expect(pasaLosFiltros(fila(), { ...sinFiltros, q: 'bogota' })).toBe(false)
  })

  it('«sin plan» es la que no tiene suscripción', () => {
    expect(pasaLosFiltros(fila({ plan: null }), { ...sinFiltros, plan: 'sin-plan' })).toBe(true)
    expect(pasaLosFiltros(fila(), { ...sinFiltros, plan: 'sin-plan' })).toBe(false)
    expect(pasaLosFiltros(fila(), { ...sinFiltros, plan: 'ACTIVE' })).toBe(true)
  })

  it('«no sé» de la cobranza por voz no entra ni en «sí» ni en «no»', () => {
    const noSe = fila({ en_cobranza_por_voz: null })
    expect(pasaLosFiltros(noSe, { ...sinFiltros, voz: 'si' })).toBe(false)
    expect(pasaLosFiltros(noSe, { ...sinFiltros, voz: 'no' })).toBe(false)
    expect(pasaLosFiltros(fila({ en_cobranza_por_voz: false }), { ...sinFiltros, voz: 'no' })).toBe(true)
  })
})

const recorrido = (cambios: Partial<RecorridoDeLaInmobiliaria> = {}): RecorridoDeLaInmobiliaria => ({
  id: 'a1',
  nombre: 'Nueva',
  se_registro: '2026-10-18T00:00:00Z',
  asistente: { estado: 'PENDING', fecha: null },
  plan: null,
  migracion: null,
  primer_contrato: null,
  primer_recibo: null,
  equipo: 0,
  ...cambios,
})

describe('el recorrido del onboarding', () => {
  it('a una recién registrada le falta abrir su asistente', () => {
    expect(loQueLeFalta(recorrido())?.paso).toBe('asistente')
  })

  it('un asistente que falló no cuenta como abierto', () => {
    expect(dioElPaso(recorrido({ asistente: { estado: 'FAILED', fecha: null } }), 'asistente')).toBe(false)
    // Abierto sin fecha guardada sigue siendo abierto: la fecha no se inventa, el paso sí se dio.
    expect(dioElPaso(recorrido({ asistente: { estado: 'ACTIVE', fecha: null } }), 'asistente')).toBe(true)
  })

  it('saltarse la migración cuenta como resolverla', () => {
    const r = recorrido({
      asistente: { estado: 'ACTIVE', fecha: '2026-10-18T00:05:00Z' },
      plan: { tier: 'ultra', nombre: 'Ultra', estado: 'ACTIVE', desde: '2026-10-18T01:00:00Z' },
      migracion: { estado: 'omitida', fecha: '2026-10-18T02:00:00Z' },
    })
    expect(loQueLeFalta(r)?.paso).toBe('contrato')
  })

  it('con todos los pasos, no le falta nada', () => {
    const r = recorrido({
      asistente: { estado: 'ACTIVE', fecha: '2026-10-18T00:05:00Z' },
      plan: { tier: 'ultra', nombre: 'Ultra', estado: 'PAST_DUE', desde: '2026-10-18T01:00:00Z' },
      migracion: { estado: 'completada', fecha: '2026-10-18T02:00:00Z' },
      primer_contrato: '2026-10-18T03:00:00Z',
      primer_recibo: '2026-10-19T03:00:00Z',
    })
    expect(loQueLeFalta(r)).toBeNull()
  })
})

describe('formatos del admin', () => {
  it('un día «AAAA-MM-DD» se lee como fecha de calendario, no como medianoche UTC', () => {
    // En Colombia (UTC−5) `new Date('2026-10-07')` es el 6 de octubre a las 7 p. m.
    expect(fmtDiaCorto('2026-10-07')).toMatch(/^7 (de )?oct$/)
    expect(fmtDiaCorto(null)).toBe('—')
  })

  it('una fecha sin zona del esquema agent es UTC; un día solo es fecha de calendario', () => {
    expect(aFecha('2026-10-20 04:33:01.373').toISOString()).toBe('2026-10-20T04:33:01.373Z')
    expect(aFecha('2026-10-20T04:33:01').toISOString()).toBe('2026-10-20T04:33:01.000Z')
    expect(aFecha('2026-10-20 04:33:01+00').toISOString()).toBe('2026-10-20T04:33:01.000Z')
    const dia = aFecha('2026-10-07')
    expect([dia.getFullYear(), dia.getMonth(), dia.getDate()]).toEqual([2026, 9, 7])
  })

  it('los porcentajes van con coma decimal y espacio antes del signo', () => {
    expect(fmtPorcentaje(12.5)).toBe('12,5 %')
    expect(fmtPorcentaje('0')).toBe('0,0 %')
    expect(fmtPorcentaje(null)).toBe('—')
  })
})
