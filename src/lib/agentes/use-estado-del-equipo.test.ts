import { describe, expect, it } from 'vitest'

import type { ActivityItem, PilotoFlotaResponse } from '@/lib/api/piloto'

import { agentePorId } from './equipo'
import { estadoDeUnAgente, trabajoDelAgente } from './use-estado-del-equipo'

function flota(agentes: PilotoFlotaResponse['agentes'], activo = true): PilotoFlotaResponse {
  return {
    activo,
    modo: 'copiloto',
    agentes,
    resumen: { sombra: 0, copiloto: 0, autonomo: 0 },
    enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
    tomadoAt: '2026-10-02T10:00:00-05:00',
  }
}

describe('estadoDeUnAgente — sólo lo que dice la flota', () => {
  it('corre y el modo lo gobierna → activo, con su modo y la frase del micro', () => {
    const f = flota([{ agente: 'cobranza', modo: 'autonomo', origen: 'piloto', corre: true, gobierna: true, actua: true, efectoReal: 'Laura llama sola.' }])
    expect(estadoDeUnAgente(agentePorId('cobranza'), f)).toEqual({ tipo: 'activo', modo: 'autonomo', efectoReal: 'Laura llama sola.' })
  })

  it('corre pero el modo no lo gobierna → disponible cuando lo pides', () => {
    const f = flota([{ agente: 'cotizador', modo: 'copiloto', origen: 'default', corre: true, gobierna: false, actua: false, efectoReal: 'Todavía no actúa solo.' }])
    expect(estadoDeUnAgente(agentePorId('cotizador'), f).tipo).toBe('aPedido')
  })

  it('no corre → apagado, con el porqué del micro', () => {
    const f = flota([{ agente: 'retencion', modo: 'copiloto', origen: 'default', corre: false, porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.' }])
    expect(estadoDeUnAgente(agentePorId('retencion'), f)).toEqual({
      tipo: 'apagado',
      porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.',
    })
  })

  it('con el piloto automático apagado en el servidor nadie figura activo', () => {
    const f = flota([{ agente: 'cobranza', modo: 'autonomo', origen: 'piloto', corre: true, gobierna: true, actua: true }], false)
    expect(estadoDeUnAgente(agentePorId('cobranza'), f).tipo).toBe('aPedido')
  })

  it('sin fila (o sin flota) no se afirma nada', () => {
    expect(estadoDeUnAgente(agentePorId('cobranza'), null).tipo).toBe('sinDato')
    expect(estadoDeUnAgente(agentePorId('pagos'), flota([])).tipo).toBe('sinDato')
  })

  it('los que no están en la flota: el chat los tiene, o están fuera del piloto automático', () => {
    expect(estadoDeUnAgente(agentePorId('documentos'), null).tipo).toBe('enElChat')
    // MANOS-1 (04-10-2026): Vidi ya está en la flota; hoy ningún agente del
    // equipo queda fuera del Piloto, así que la rama se prueba con uno armado.
    expect(estadoDeUnAgente({ ...agentePorId('documentos'), autonomia: null, despachos: [] }, null).tipo).toBe('fueraDelPiloto')
    expect(estadoDeUnAgente(agentePorId('inspeccion'), null).tipo).toBe('sinDato')
  })
})

describe('trabajoDelAgente — el feed, filtrado por agente', () => {
  const items: ActivityItem[] = [
    { id: '1', at: '2026-10-01T09:00:00-05:00', agente: 'cobranza', tipo: 'llamada', titulo: 'Llamada a Juan P.' },
    { id: '2', at: '2026-10-02T09:00:00-05:00', agente: 'cobranza', tipo: 'promesa', titulo: 'Promesa de Ana M.' },
    { id: '3', at: '2026-10-02T08:00:00-05:00', agente: 'gerente', tipo: 'huella', titulo: 'Briefing' },
  ]

  it('sólo lo suyo, lo más nuevo primero', () => {
    expect(trabajoDelAgente(agentePorId('cobranza'), items).map((i) => i.id)).toEqual(['2', '1'])
  })

  it('nadie hereda el trabajo de otro', () => {
    expect(trabajoDelAgente(agentePorId('pagos'), items)).toEqual([])
    expect(trabajoDelAgente(agentePorId('documentos'), items)).toEqual([])
  })
})
