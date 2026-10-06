/**
 * Las cuentas del centro de mando (fase 1). Lo que se fija aquí es lo que hace
 * que un número NO mienta: «sin dato» no es 0, un número no se repite, los días
 * a medias no hacen tendencia, el chat no es el piloto automático.
 */
import { describe, expect, it } from 'vitest'

import type { ActivityItem, PilotoFlotaResponse, PulsoAlerta, PulsoResponse } from '@/lib/api/piloto'
import type { DirectorHoy, MetaDelDirector } from '@/lib/api/piloto-director'

import {
  actividadPorDia,
  alertasParaMostrar,
  alertasPorSeveridad,
  avanceDeMeta,
  avanceDelPlan,
  conteoDeLaFlota,
  estadoDelMando,
  eventosDeHoy,
  hechoHoy,
  horaDelCuando,
  solosHoyPorAgente,
  vozDelDia,
} from './calculos'
import { crearMuestra } from './muestra'

// Lunes 5 de octubre de 2026, 3:00 p. m. en Colombia (UTC−5).
const AHORA = Date.parse('2026-10-05T20:00:00Z')

const pulso = (p: Partial<PulsoResponse> = {}): PulsoResponse => ({
  estado: 'ok',
  titular: 'Todo tranquilo.',
  enCurso: [],
  alertas: [],
  hoy: { llamadas: 0, conversacionesActivas: 0, decisionesResueltas: 0 },
  ...p,
})

const alerta = (id: string, severidad: PulsoAlerta['severidad'], titulo = id): PulsoAlerta => ({ id, severidad, titulo, detalle: '' })

const accion = (id: string, at: string, agente = 'cobranza'): ActivityItem => ({ id, at, agente, tipo: 'piloto', titulo: id })

describe('el estado del mando', () => {
  it('apagado manda sobre lo que diga el pulso; un estado raro es «sin lectura», nunca verde', () => {
    expect(estadoDelMando(pulso({ estado: 'atencion' }), false)).toBe('apagado')
    expect(estadoDelMando(pulso({ estado: 'critico' }), true)).toBe('critico')
    expect(estadoDelMando(pulso({ estado: 'raro' as never }), true)).toBe('desconocido')
    expect(estadoDelMando(null, null)).toBe('desconocido')
  })
})

describe('la voz del día: una sola, y sin repetir el número de un medidor', () => {
  const decisiones = alerta('decisiones-esperando', 'media', '5 decisiones esperan tu visto bueno')
  const p = pulso({ titular: '5 decisiones esperan tu visto bueno.', alertas: [decisiones] })

  it('con el plan del director de hoy, habla el director', () => {
    const hoy = { encendido: true, resumen: 'Hoy el foco es la cartera.', ciclo: { estado: 'listo', fin: '2026-10-05T10:02:00Z' } } as unknown as DirectorHoy
    expect(vozDelDia(hoy, p, null)).toMatchObject({ quien: 'director', texto: 'Hoy el foco es la cartera.' })
  })

  it('si el titular es la alerta de las decisiones (su número ya es un KPI), habla la lectura del Gerente', () => {
    expect(vozDelDia(null, p, { resumen: ['La Bandeja tiene tareas de la operación.'] })).toMatchObject({ quien: 'gerente' })
  })

  it('sin lectura del Gerente, queda el titular del pulso', () => {
    expect(vozDelDia(null, p, null)).toMatchObject({ quien: 'pulso', texto: '5 decisiones esperan tu visto bueno.' })
  })

  it('la alerta de las decisiones no se lista ni se cuenta (ya es su KPI); la del titular no se repite', () => {
    const otra = alerta('acuerdos', 'alta', '3 acuerdos vencen hoy')
    expect(alertasParaMostrar([decisiones, otra], '3 acuerdos vencen hoy.').map((a) => a.id)).toEqual([])
    expect(alertasPorSeveridad([decisiones, otra, alerta('x', 'raro' as never)])).toEqual({ critica: 0, alta: 2, media: 0, info: 0 })
  })
})

describe('el director', () => {
  it('el avance del plan cuenta hechas sobre las que siguen vivas', () => {
    const hoy = {
      encendido: true,
      ordenes: ['ejecutada', 'aprobada', 'en_bandeja', 'la_hace_el_agente', 'descartada'].map((estado) => ({ estado })),
    } as unknown as DirectorHoy
    expect(avanceDelPlan(hoy)).toEqual({ total: 5, hechas: 2, enBandeja: 1, agente: 1, fuera: 1, avance: 0.5 })
    expect(avanceDelPlan({ encendido: false, ordenes: [] } as unknown as DirectorHoy)).toBeNull()
  })

  it('el avance de una meta sirve para subir y para bajar, y sin dato es null', () => {
    const m = (p: Partial<MetaDelDirector>) => ({ lineaBase: 0.86, objetivo: 0.92, actual: 0.89, ...p }) as MetaDelDirector
    expect(avanceDeMeta(m({}))).toBeCloseTo(0.5)
    expect(avanceDeMeta(m({ lineaBase: 9.4, objetivo: 7, actual: 8.2 }))).toBeCloseTo(0.5)
    expect(avanceDeMeta(m({ actual: null }))).toBeNull()
    expect(avanceDeMeta(m({ actual: 1 }))).toBe(1)
  })

  it('«cuándo» en palabras del micro se vuelve una hora de hoy; otro día o sin hora, no', () => {
    expect(horaDelCuando('el lunes 5 de octubre a las 4:30 p. m.', AHORA).at?.toISOString()).toBe('2026-10-05T21:30:00.000Z')
    expect(horaDelCuando('el martes 6 de octubre a las 8:00 a. m.', AHORA)).toEqual({ at: null, esDeHoy: false })
    expect(horaDelCuando('hoy', AHORA)).toEqual({ at: null, esDeHoy: true })
    expect(horaDelCuando('2026-10-05T14:00:00Z', AHORA).esDeHoy).toBe(true)
  })
})

describe('la flota y lo del día', () => {
  it('el chat no cuenta como agente del piloto automático', () => {
    const flota = {
      agentes: [
        { agente: 'cobranza', modo: 'autonomo', corre: true, actua: true },
        { agente: 'estudio', modo: 'copiloto', corre: true, actua: false },
        { agente: 'avaluos', modo: 'sombra', corre: false, actua: false },
        { agente: 'chat', modo: 'copiloto', corre: true, actua: true },
      ],
    } as unknown as PilotoFlotaResponse
    expect(conteoDeLaFlota(flota)).toEqual({ total: 3, encendidos: 2, actuan: 1, porModo: { sombra: 0, copiloto: 1, autonomo: 1 } })
  })

  it('lo del día sin pulso es «sin dato» (null), no ceros; los acuerdos se leen con el nombre que manda el micro', () => {
    expect(hechoHoy(null, null)).toBeNull()
    const h = hechoHoy(pulso(), { numeros: { promesasCreadasHoy: 4 } as never })
    expect(h?.promesas).toBe(4)
    expect(h?.planeados).toBeNull()
  })

  it('lo que hicieron solos hoy: por el día de Colombia y sin las acciones del equipo', () => {
    const items = [
      accion('a', '2026-10-05T19:00:00Z'),
      accion('b', '2026-10-05T13:00:00Z', 'conciliacion'),
      accion('c', '2026-10-05T12:00:00Z', 'equipo'),
      { ...accion('e', '2026-10-05T14:00:00Z', 'aprobaciones'), detalle: 'Lo decidió una persona del equipo' },
      accion('d', '2026-10-05T03:00:00Z'), // 4-oct 10 p. m. en Colombia
    ]
    const r = solosHoyPorAgente(items, AHORA, 50)
    expect(r.total).toBe(2)
    expect(r.porAgente.map((x) => x.agente)).toEqual(['cobranza', 'conciliacion'])
    expect(r.recortado).toBe(false)
  })

  it('la tendencia por día sólo usa días completos: sin hoy, sin el más viejo si el feed vino recortado, y con 3 o más', () => {
    const dias = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
    const items = dias.flatMap((d, i) => Array.from({ length: i + 1 }, (_, k) => accion(`${d}-${k}`, `${d}T15:00:00Z`))).reverse()
    expect(actividadPorDia(items, AHORA, 50)?.map((x) => x.dia)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    // Recortado (la lista llegó al tope): el día más viejo va a medias y sale; quedan 3.
    expect(actividadPorDia(items, AHORA, items.length)?.map((x) => x.dia)).toEqual(['2026-10-02', '2026-10-03', '2026-10-04'])
    expect(actividadPorDia(items.slice(0, 9), AHORA, 50)).toBeNull()
  })
})

describe('la línea del día', () => {
  it('pone lo que corrió, lo que corre y lo que viene, en orden de hora', () => {
    const m = crearMuestra(AHORA)
    const { conHora, sinHora } = eventosDeHoy({ actividad: m.actividad, pulso: m.pulso, hoy: m.hoy, ahora: AHORA })
    const momentos = new Set(conHora.map((e) => e.momento))
    expect(momentos).toEqual(new Set(['corrio', 'corre', 'viene']))
    const horas = conHora.map((e) => (e.at as Date).getTime())
    expect([...horas].sort((a, b) => a - b)).toEqual(horas)
    // Las acciones del equipo no son de los agentes.
    expect(conHora.some((e) => e.agente === 'equipo')).toBe(false)
    expect(sinHora.every((e) => e.momento === 'viene')).toBe(true)
  })
})

describe('la muestra', () => {
  it('es una inmobiliaria verosímil: «hoy» es hoy y las personas son ficticias', () => {
    const m = crearMuestra(AHORA)
    expect(m.actividad.length).toBeLessThanOrEqual(50)
    expect(m.hoy.fecha).toBe('2026-10-05')
    expect(m.bandeja.items.every((i) => i.id.startsWith('muestra:'))).toBe(true)
    const texto = JSON.stringify(m)
    expect(texto).toMatch(/Ejemplo|Muestra|Ficticia/)
  })
})
