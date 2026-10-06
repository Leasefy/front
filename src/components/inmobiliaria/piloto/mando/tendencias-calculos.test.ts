/**
 * MANDO-DATOS (05-10-2026) · las cuentas de las tendencias del centro de mando
 * (lo recuperado por día, la mora, las acciones por día y por agente, las
 * horas y el recaudo del mes) y su lugar en los indicadores.
 */
import { describe, expect, it } from 'vitest'

import type { BriefingNumeros, PilotoTendencias } from '@/lib/api/piloto'
import type { ComoSeMideLaTasa } from '@/lib/tasa-de-recaudo'

import { agentesDeLasBarras, barrasDeLasAcciones, horasEnPalabras, recaudoConSuBase, recuperadoDelMesDeLaSerie, tendenciaDeMora } from './calculos'
import { indicadoresDelMando } from './indicadores'
import { crearMuestra } from './muestra'
import type { DatosDelMando, Pieza } from './tipos'

const AHORA = Date.parse('2026-10-05T17:00:00Z') // 12:00 m. en Colombia

describe('las tendencias (datos 1 a 5)', () => {
  it('dato 1 · lo recuperado del mes sale de la serie diaria cuando el briefing no lo trae', () => {
    const dias = [
      { fecha: '2026-09-30', cop: 1_000_000 },
      { fecha: '2026-10-01', cop: 250_000.5 },
      { fecha: '2026-10-05', cop: 0.25 },
    ]
    expect(recuperadoDelMesDeLaSerie(dias, AHORA)).toBe(250_000.75)
    expect(recuperadoDelMesDeLaSerie([{ fecha: '2026-09-30', cop: 1 }], AHORA)).toBeNull()
  })

  it('dato 2 · las barras de 14 días apilan lo que hicieron solos, por agente; la leyenda en orden fijo', () => {
    const barras = barrasDeLasAcciones(
      [
        { fecha: '2026-10-05', total: 5, solos: 4, conPersona: 1, porAgente: [{ agente: 'cobranza', solos: 3, conPersona: 1 }, { agente: 'facturacion', solos: 1, conPersona: 0 }] },
        { fecha: '2026-10-04', total: 6, solos: 6, conPersona: 0, porAgente: [{ agente: 'facturacion', solos: 6, conPersona: 0 }] },
      ],
      '2026-10-05',
    )
    expect(barras.map((b) => b.fecha)).toEqual(['2026-10-04', '2026-10-05'])
    expect(barras[1]).toMatchObject({ esHoy: true, solos: 4, conPersona: 1, porAgente: [{ agente: 'cobranza', n: 3 }, { agente: 'facturacion', n: 1 }] })
    expect(agentesDeLasBarras(barras)).toEqual(['facturacion', 'cobranza'])
  })

  it('dato 3 · las horas en palabras', () => {
    expect(horasEnPalabras(84)).toBe('84\u00a0h')
    expect(horasEnPalabras(1.5)).toBe('1,5\u00a0h')
    expect(horasEnPalabras(0.75)).toBe('45\u00a0min')
    expect(horasEnPalabras(0)).toBe('0 h')
  })

  it('dato 4 · el recaudo del mes es la medida del back con la base que eligió la inmobiliaria (aquí no se divide)', () => {
    const r: ComoSeMideLaTasa = {
      month: '2026-10',
      base: 'EMITIDO',
      porDefecto: false,
      disponible: true,
      opciones: [
        { base: 'CAUSADO', porDefecto: false, rotulo: 'Recaudo sobre lo causado', definicion: '', numeradorCop: 1, denominadorCop: 10, pct: 10 },
        { base: 'EMITIDO', porDefecto: false, rotulo: 'Pagado de lo emitido', definicion: '', numeradorCop: 1, denominadorCop: 2, pct: 50 },
      ],
    }
    expect(recaudoConSuBase(r)?.pct).toBe(50)
    expect(recaudoConSuBase(null)).toBeNull()
  })

  it('dato 5 · la tendencia de la mora larga: el último saldo y cuánto cambió; con un solo día no hay tendencia', () => {
    const t = tendenciaDeMora([
      { fecha: '2026-10-03', valor: 9, saldoCop: 30_000_000 },
      { fecha: '2026-10-05', valor: 8.1, saldoCop: 27_500_000.5 },
      { fecha: '2026-10-04', valor: null, saldoCop: null },
    ])
    expect(t).toMatchObject({ saldo: 27_500_000.5, dias: 8.1, cambio: -2_499_999.5, diasDeLaSerie: 2, serie: [30_000_000, 27_500_000.5] })
    expect(tendenciaDeMora([{ fecha: '2026-10-05', valor: 1, saldoCop: 1 }])).toBeNull()
  })
})

describe('los indicadores con las tendencias', () => {
  const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })
  function datos(tendencias: PilotoTendencias | null, numeros: BriefingNumeros = {}): DatosDelMando {
    const m = crearMuestra(AHORA)
    return {
      fuente: 'real',
      limiteDeActividad: 50,
      pulso: lista(m.pulso),
      bandeja: lista({ items: m.bandeja.items, total: m.bandeja.total, porPrioridad: m.bandeja.porPrioridad }),
      actividad: lista(m.actividad),
      briefing: lista({ ...m.briefing, numeros }),
      flota: lista(m.flota),
      hoy: lista(m.hoy),
      metas: lista(m.metas),
      tendencias: { data: tendencias, isLoading: false, error: null, notAvailable: false },
      recaudo: lista(m.recaudo),
    }
  }
  it('sin `recuperadoMesCop` (el micro lo omite en 0), «Recuperado este mes» sale de la serie: se sabe que fue 0', () => {
    const t = crearMuestra(AHORA).tendencias
    const cero = { ...t, recuperado: { ...t.recuperado!, dias: t.recuperado!.dias.map((d) => ({ ...d, cop: 0 })) } }
    const ind = indicadoresDelMando(datos(cero), AHORA)
    expect(ind.recuperado).toBe(0)
    expect(ind.recuperadoPorDia).toHaveLength(30)
  })
  it('con el briefing, manda el briefing; sin tendencias, cada pieza nueva es «sin dato»', () => {
    expect(indicadoresDelMando(datos(crearMuestra(AHORA).tendencias, { recuperadoMesCop: 9 }), AHORA).recuperado).toBe(9)
    const sin = indicadoresDelMando({ ...datos(null), tendencias: lista<PilotoTendencias>(null as unknown as PilotoTendencias), recaudo: lista<ComoSeMideLaTasa>(null as unknown as ComoSeMideLaTasa) }, AHORA)
    expect(sin).toMatchObject({ recuperado: null, recuperadoPorDia: null, acciones: null, horas: null, mora: null, recaudo: null })
  })
  it('la muestra trae las piezas nuevas (para ver el panel encendido)', () => {
    const ind = indicadoresDelMando(datos(crearMuestra(AHORA).tendencias), AHORA)
    expect(ind.acciones?.barras).toHaveLength(14)
    expect(ind.horas).toMatchObject({ medidas: 12, estimadas: 72, estimada: true })
    expect(ind.mora?.serie.length).toBeGreaterThan(1)
    expect(ind.recaudo?.base).toBe('CAUSADO')
    expect(ind.metasEstimadasAparte).toBe(1)
  })
  it('una meta activa con el objetivo en su línea base (poca historia: «arranca en tu nivel de hoy») existe: no es «sin metas»', () => {
    const d = datos(crearMuestra(AHORA).tendencias)
    const base = d.metas.data!.metas[0]!
    const metas = {
      ...d.metas.data!,
      metas: [
        { ...base, id: 'r', metrica: 'recuperado', estado: 'activa', estimada: false, lineaBase: 14302500.75, objetivo: 14302500.75, actual: 26755002 },
        { ...base, id: 'm', metrica: 'mora_30', estado: 'activa', estimada: false, lineaBase: 13.3, objetivo: 13.3, actual: 13 },
        { ...base, id: 'h', metrica: 'horas_ahorradas', estado: 'activa', estimada: true, lineaBase: 4.4, objetivo: 4.4, actual: 9.2 },
      ],
    }
    const ind = indicadoresDelMando({ ...d, metas: lista(metas) }, AHORA)
    expect(ind.avanceDeMetas).toBeNull()
    expect(ind.metasEnSuPuntoDePartida).toBe(2)
    expect(ind.metasEstimadasAparte).toBe(1)
  })
})
