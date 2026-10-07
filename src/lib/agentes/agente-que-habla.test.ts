import { describe, expect, it } from 'vitest'

import type { AgentExecution, ChatMessage, TurnStep } from '@/lib/types/beta-chat'

import { ESTADO_DEL_ORBE, agenteDeLaEjecucion, leerElTurno, leerRazonamiento } from './agente-que-habla'

const ahora = new Date('2026-10-02T10:00:00-05:00')

function ejecucion(p: Partial<AgentExecution> & Pick<AgentExecution, 'id' | 'agentType' | 'status'>): AgentExecution {
  return { taskDescription: 'Arma una estrategia para Juan Pérez', startedAt: ahora, ...p }
}

function mensaje(p: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm1', role: 'assistant', content: 'Listo.', timestamp: ahora, status: 'complete', ...p }
}

describe('ESTADO_DEL_ORBE', () => {
  it('lleva los estados del producto a los del orbe de Cadence', () => {
    expect(ESTADO_DEL_ORBE).toEqual({
      quieto: 'idle',
      pensando: 'thinking',
      trabajando: 'working',
      hablando: 'working',
      listo: 'ready',
      fallo: 'failed',
      apagado: 'off',
    })
  })
})

describe('leerElTurno — el resumen del especialista en un mensaje cerrado', () => {
  it('si el chat guardó `resumen` en la ejecución, la delegación lo trae; si no, no se inventa', () => {
    const conResumen = { ...ejecucion({ id: 'e1', agentType: 'cobranza', status: 'completed' }), resumen: '  Propone 3 cuotas de $800.000.  ' }
    const sinResumen = ejecucion({ id: 'e2', agentType: 'reportes', status: 'completed' })
    const r = leerElTurno({
      mensaje: mensaje({ agentActivity: { id: 'b1', messageId: 'm1', startedAt: ahora, agents: [conResumen, sinResumen] } }),
    })
    expect(r.delegaciones[0]?.resumen).toBe('Propone 3 cuotas de $800.000.')
    expect(r.delegaciones[1]).not.toHaveProperty('resumen')
  })
})

describe('leerElTurno — un mensaje ya cerrado', () => {
  it('sin despachos: habló sólo el orquestador, y terminó', () => {
    const r = leerElTurno({ mensaje: mensaje() })
    expect(r.orquestador.agente.id).toBe('orquestador')
    expect(r.orquestador.estado).toBe('listo')
    expect(r.delegaciones).toEqual([])
    expect(r.hablaAhora.id).toBe('orquestador')
    expect(r.razonamiento).toBeNull()
  })

  it('con despachos: cada ejecución es una delegación a su agente, con su tarea y su estado', () => {
    const r = leerElTurno({
      mensaje: mensaje({
        agentActivity: {
          id: 'b1',
          messageId: 'm1',
          startedAt: ahora,
          agents: [
            ejecucion({ id: 'e1', agentType: 'cobranza', status: 'completed' }),
            ejecucion({ id: 'e2', agentType: 'avaluo', status: 'failed', error: 'El servicio de avalúos no respondió' }),
          ],
        },
      }),
    })
    expect(r.delegaciones.map((d) => [d.agente?.id, d.clave, d.estado])).toEqual([
      ['cobranza', 'cobranza', 'listo'],
      ['avaluos', 'avaluo', 'fallo'],
    ])
    expect(r.delegaciones[0]?.tarea).toBe('Arma una estrategia para Juan Pérez')
    expect(r.delegaciones[1]?.error).toBe('El servicio de avalúos no respondió')
  })

  it('una clave que no es del equipo queda sin agente (no se inventa uno)', () => {
    const r = leerElTurno({
      mensaje: mensaje({
        agentActivity: { id: 'b', messageId: 'm1', startedAt: ahora, agents: [ejecucion({ id: 'e', agentType: 'pipeline', status: 'completed' })] },
      }),
    })
    expect(r.delegaciones[0]?.agente).toBeNull()
    expect(agenteDeLaEjecucion({ agentType: 'pipeline' })).toBeNull()
  })

  it('un mensaje con error: el orquestador falló', () => {
    expect(leerElTurno({ mensaje: mensaje({ status: 'error' }) }).orquestador.estado).toBe('fallo')
  })
})

describe('leerElTurno — el turno en curso (pasos de useBetaChat)', () => {
  const corriendo: TurnStep[] = [
    { id: 'entender', kind: 'entender', status: 'done' },
    { id: 'e1', kind: 'agente', labelKey: 'beta.tasks.plan.consultAgent', detail: 'Arma una estrategia', agentType: 'cobranza', status: 'running' },
    { id: 'tool-a-0', kind: 'herramienta', label: 'Revisé los límites de la inmobiliaria', status: 'done' },
    { id: 'tool-b-1', kind: 'herramienta', label: 'Calculé el plan de cuotas', status: 'done', repeticiones: 2 },
  ]
  const enVuelo = mensaje({
    status: 'streaming',
    content: '',
    agentActivity: {
      id: 'b',
      messageId: 'm1',
      startedAt: ahora,
      agents: [ejecucion({ id: 'e1', agentType: 'cobranza', status: 'running', taskDescription: 'Arma una estrategia' })],
    },
  })

  it('mientras el especialista trabaja: él habla ahora y el orquestador espera pensando', () => {
    const r = leerElTurno({ mensaje: enVuelo, pasos: corriendo, enCurso: true })
    expect(r.orquestador.estado).toBe('pensando')
    expect(r.hablaAhora.nombrePropio).toBe('Laura')
    expect(r.delegaciones).toHaveLength(1)
    expect(r.delegaciones[0]?.estado).toBe('trabajando')
    expect(r.delegaciones[0]?.tarea).toBe('Arma una estrategia')
    // Las herramientas llegan sin agentType: son del último especialista abierto.
    expect(r.delegaciones[0]?.pasos.map((p) => p.texto)).toEqual([
      'Revisé los límites de la inmobiliaria',
      'Calculé el plan de cuotas',
    ])
    expect(r.delegaciones[0]?.pasos[1]?.repeticiones).toBe(2)
  })

  it('cuando el especialista cierra, su `detail` es el resumen y la tarea sale de la ejecución', () => {
    const pasos: TurnStep[] = [
      { ...corriendo[1]!, status: 'done', detail: 'Le propuse 3 cuotas de $800.000' },
      { id: 'redactar', kind: 'redactar', status: 'running' },
    ]
    const r = leerElTurno({ mensaje: { ...enVuelo, content: 'Juan puede' }, pasos, enCurso: true })
    expect(r.delegaciones[0]?.estado).toBe('listo')
    expect(r.delegaciones[0]?.tarea).toBe('Arma una estrategia')
    expect(r.delegaciones[0]?.resumen).toBe('Le propuse 3 cuotas de $800.000')
    expect(r.orquestador.estado).toBe('hablando')
    expect(r.hablaAhora.id).toBe('orquestador')
  })

  it('al empezar, sin despachos: el orquestador piensa', () => {
    const r = leerElTurno({
      mensaje: mensaje({ status: 'sending', content: '' }),
      pasos: [{ id: 'entender', kind: 'entender', status: 'running' }],
      enCurso: true,
    })
    expect(r.orquestador.estado).toBe('pensando')
  })
})

describe('leerRazonamiento — sólo lo que manda el micro', () => {
  it('no hay campo → null (nunca se rellena con los pasos)', () => {
    expect(leerRazonamiento(undefined)).toBeNull()
    expect(leerRazonamiento('')).toBeNull()
    expect(leerRazonamiento([])).toBeNull()
    expect(leerRazonamiento({ texto: 'x' })).toBeNull()
  })

  it('acepta un texto o una lista de pasos, con o sin agente', () => {
    expect(leerRazonamiento('Primero miré la cartera.')).toEqual([{ texto: 'Primero miré la cartera.' }])
    expect(
      leerRazonamiento([{ texto: 'Miré la cartera', agente: 'orquestador' }, 'Llamé a cobranza', { texto: '  ' }, 7]),
    ).toEqual([{ texto: 'Miré la cartera', agente: 'orquestador' }, { texto: 'Llamé a cobranza' }])
  })

  it('llega por el mensaje cuando el chat lo guarda', () => {
    const r = leerElTurno({ mensaje: { ...mensaje(), razonamiento: ['Busqué a Juan'] } })
    expect(r.razonamiento).toEqual([{ texto: 'Busqué a Juan' }])
  })
})
