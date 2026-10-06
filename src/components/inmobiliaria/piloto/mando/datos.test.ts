/**
 * MANDO-DATOS (05-10-2026) · los datos que el centro de mando del piloto
 * automático ya no deduce: quién hizo cada acción y el agente de lo que está
 * en curso vienen como CAMPO, el «cuándo» de las órdenes como instante, un solo
 * nombre para las promesas de hoy, y las tendencias (lo recuperado por día, la
 * mora, las acciones por día y por agente, las horas y el recaudo del mes).
 */
import { describe, expect, it } from 'vitest'

import type { ActivityItem, BriefingNumeros, PulsoResponse } from '@/lib/api/piloto'
import type { DirectorHoy, MetaDelDirector, OrdenDelDirector } from '@/lib/api/piloto-director'

import { agenteDelEnCurso, avanceMedio, esDeUnaPersona, eventosDeHoy, hechoHoy, solosHoyPorAgente } from './calculos'

const AHORA = Date.parse('2026-10-05T17:00:00Z') // 12:00 m. en Colombia
const item = (extra: Partial<ActivityItem>): ActivityItem => ({ id: 'a', at: '2026-10-05T15:00:00Z', agente: 'facturacion', tipo: 'piloto', titulo: 'Hecho', ...extra })

describe('🔴 dato 7 · quién hizo cada acción, como campo', () => {
  it('con el campo, una persona es `equipo` o `tu` aunque el texto no lo diga', () => {
    expect(esDeUnaPersona(item({ quien: 'equipo', detalle: 'Hecho: Emitir las facturas' }))).toBe(true)
    expect(esDeUnaPersona(item({ quien: 'tu' }))).toBe(true)
    // Y el agente solo, aunque el texto viejo dijera otra cosa.
    expect(esDeUnaPersona(item({ quien: 'solo', detalle: 'Lo decidió una persona del equipo' }))).toBe(false)
  })
  it('«Hicieron solos hoy» cuenta con el campo', () => {
    const r = solosHoyPorAgente([item({ id: '1', quien: 'solo' }), item({ id: '2', quien: 'equipo' }), item({ id: '3', quien: 'solo', agente: 'cobranza' })], AHORA, 50)
    expect(r.total).toBe(2)
    expect(r.porAgente.map((a) => a.agente).sort()).toEqual(['cobranza', 'facturacion'])
  })
  it('un micro anterior (sin el campo) se lee como antes', () => {
    expect(esDeUnaPersona(item({ agente: 'equipo' }))).toBe(true)
    expect(esDeUnaPersona(item({ detalle: 'Lo decidió una persona del equipo' }))).toBe(true)
  })
})

describe('🔴 dato 8 · el agente de lo que está en curso, como campo', () => {
  it('lee el campo, también donde el tipo no dice nada (una decisión que espera)', () => {
    expect(agenteDelEnCurso({ tipo: 'espera', agente: 'retencion' })).toBe('retencion')
    expect(agenteDelEnCurso({ tipo: 'llamada', agente: 'cobranza' })).toBe('cobranza')
  })
  it('sin el campo (un micro anterior), como antes; sin coincidencia, nadie', () => {
    expect(agenteDelEnCurso({ tipo: 'conversacion' })).toBe('cobranza')
    expect(agenteDelEnCurso({ tipo: 'espera' })).toBeNull()
  })
})

describe('🔴 dato 9 · el «cuándo» de una orden del director como instante', () => {
  const orden = (o: Partial<OrdenDelDirector>): OrdenDelDirector => ({
    ordenId: 'o-1',
    agente: 'cobranza',
    agenteNombre: 'Laura',
    proceso: 'gerente.x',
    procesoNombre: 'Llamar',
    entidad: null,
    cuando: null,
    prioridad: 1,
    porQue: '',
    evidencia: [],
    meta: null,
    alternativaDescartada: null,
    conflictoResuelto: null,
    estado: 'la_hace_el_agente',
    accionId: null,
    motivoDeLaPerilla: null,
    ...o,
  })
  const hoy = (ordenes: OrdenDelDirector[]): DirectorHoy => ({ encendido: true, ordenes } as unknown as DirectorHoy)

  it('con `cuandoIso` la orden va a su hora en la línea del día, sin leer las palabras', () => {
    const { conHora, sinHora } = eventosDeHoy({
      actividad: [],
      pulso: null,
      hoy: hoy([orden({ cuando: 'cuando se pueda', cuandoIso: '2026-10-05T15:30:00.000-05:00' })]),
      ahora: AHORA,
    })
    expect(sinHora).toEqual([])
    expect(conHora[0]?.at?.toISOString()).toBe('2026-10-05T20:30:00.000Z')
  })
  it('sin `cuandoIso` (un micro anterior), las palabras de siempre', () => {
    const { conHora } = eventosDeHoy({ actividad: [], pulso: null, hoy: hoy([orden({ cuando: 'el lunes 5 de octubre a las 3:00 p. m.' })]), ahora: AHORA })
    expect(conHora[0]?.at?.toISOString()).toBe('2026-10-05T20:00:00.000Z')
  })
})

describe('🔴 dato 10 · un solo nombre: `promesasCreadasHoy`', () => {
  const pulso = { hoy: { llamadas: 1, conversacionesActivas: 0, decisionesResueltas: 0 } } as PulsoResponse
  it('las promesas de hoy salen de `promesasCreadasHoy`', () => {
    expect(hechoHoy(pulso, { numeros: { promesasCreadasHoy: 4 } })?.promesas).toBe(4)
  })
  it('el nombre viejo ya no existe (el micro nunca lo mandó)', () => {
    // @ts-expect-error — `promesasHoy` ya no es parte del contrato del briefing.
    const viejo: BriefingNumeros = { promesasHoy: 4 }
    expect(hechoHoy(pulso, { numeros: viejo })?.promesas).toBeNull()
  })
})

describe('🔴 los medidores con meta estimada', () => {
  const meta = (m: Partial<MetaDelDirector>): MetaDelDirector =>
    ({ id: 'm', metrica: 'x', nombre: 'x', estado: 'activa', direccion: 'subir', unidad: 'porcentaje', lineaBase: 0, objetivo: 1, actual: 0.5, desde: null, hasta: null, estimada: false, porQue: '', serie: [], historial: [], ...m }) as MetaDelDirector
  it('el promedio va sólo con las metas de cifra real; las horas estimadas quedan fuera y lo recuperado entra', () => {
    const r = avanceMedio([
      meta({ id: '1', actual: 0.5 }),
      meta({ id: '2', metrica: 'horas_ahorradas', unidad: 'horas', objetivo: 100, actual: 100, estimada: true }),
      meta({ id: '3', metrica: 'recuperado', unidad: 'pesos', lineaBase: 0, objetivo: 1_000_000, actual: 250_000 }),
    ])
    expect(r).toEqual({ n: 2, avance: (0.5 + 0.25) / 2 })
  })
})
