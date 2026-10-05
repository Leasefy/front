import { describe, expect, it } from 'vitest'
import { AGENT_ORB_PALETTES } from '@leasefy/cadence'

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'
import type { BackendDispatchAgent } from '@/lib/api/ai-hub-chat'
import type { AgentType } from '@/lib/types/beta-chat'

import {
  EQUIPO,
  FRENTES,
  agenteDeLaAutonomia,
  agenteDelDespacho,
  agentePorId,
  agentesDelFrente,
  loLlamaElChat,
  nombreDelAgente,
} from './equipo'
import { NOMBRE_DEL_ORQUESTADOR, PROPUESTAS_DE_NOMBRE } from './nombre-del-orquestador'

function valor(obj: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj)
}

/** Todas las claves que el registro y el modal piden. */
function clavesDelEquipo(): string[] {
  const out: string[] = []
  for (const a of EQUIPO) {
    const b = `agentes.${a.id}`
    if (!a.nombrePropio) out.push(`${b}.nombre`)
    out.push(`${b}.rol`, `${b}.historia`)
    a.hace.forEach((k) => out.push(`${b}.hace.${k}`))
    a.noHace.forEach((i) => out.push(`${b}.noHace.${i.clave}`))
    a.herramientas.forEach((k) => out.push(`agentes.herramientas.${k}`))
  }
  FRENTES.forEach((f) => out.push(`agentes.frentes.${f}`))
  for (const e of ['quieto', 'pensando', 'trabajando', 'hablando', 'listo', 'fallo', 'apagado']) out.push(`agentes.orbe.${e}`)
  for (const e of ['activo', 'aPedido', 'apagado', 'enElChat', 'fueraDelPiloto', 'sinDato']) out.push(`agentes.equipo.estado.${e}`)
  for (const m of ['sombra', 'copiloto', 'autonomo']) out.push(`agentes.equipo.modo.${m}`)
  return out
}

/**
 * Las claves que el micro (bugs-nico-1) manda en `dispatch_*.agent`:
 * `DispatchAgentKeySchema` en `src/mastra/agents/chat/dispatch-tools.ts`.
 */
const DESPACHOS_DEL_MICRO = [
  'cobranza',
  'cotizador',
  'estudio',
  'matching',
  'avaluo',
  'conciliacion',
  'pagos',
  'documentos',
  'reportes',
  'comunicacion',
] as const

/**
 * La flota del piloto automático (`AGENTES_CON_AUTONOMIA`, `piloto/flota.ts`):
 * AGENTE_IDS ∪ AGENTES_GOBERNADOS ∪ AGENTES_DE_LA_OPERACION ∪ chat.
 */
const FLOTA_DEL_MICRO = [
  'cobranza',
  'cotizador',
  'conciliacion',
  'pagos',
  'estudio',
  'matching',
  'avaluos',
  'retencion',
  'calidad',
  'mantenimiento',
  // MANOS-1 (04-10-2026): Vidi entra al Piloto (inspección de entrada y salida).
  'inspeccion',
  'prospectos',
  'aprobaciones',
  'contratos',
  'facturacion',
  'propietarios',
  'contabilidad',
  'chat',
]

describe('el registro del equipo', () => {
  it('cada agente tiene un id único y un frente que existe', () => {
    const ids = EQUIPO.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of EQUIPO) expect(FRENTES).toContain(a.frente)
    for (const f of FRENTES) expect(agentesDelFrente(f).length).toBeGreaterThan(0)
  })

  it('hay UN orquestador, con el nombre de un solo lugar y su orbe de orquestador', () => {
    const orq = EQUIPO.filter((a) => a.orbe.variante === 'orchestrator')
    expect(orq.map((a) => a.id)).toEqual(['orquestador'])
    expect(agentePorId('orquestador').nombrePropio).toBe(NOMBRE_DEL_ORQUESTADOR)
    expect(PROPUESTAS_DE_NOMBRE.map((p) => p.nombre)).toContain(NOMBRE_DEL_ORQUESTADOR)
  })

  it('cada orbe usa una paleta de Cadence y ningún agente repite paleta', () => {
    const paletas = EQUIPO.map((a) => a.orbe.paleta)
    for (const p of paletas) expect(Object.keys(AGENT_ORB_PALETTES)).toContain(p)
    expect(new Set(paletas).size).toBe(paletas.length)
    for (const p of PROPUESTAS_DE_NOMBRE) expect(Object.keys(AGENT_ORB_PALETTES)).toContain(p.paleta)
  })

  it('los nombres propios del orquestador no chocan con los del equipo', () => {
    const propios = EQUIPO.filter((a) => a.id !== 'orquestador').map((a) => a.nombrePropio?.toLowerCase())
    for (const p of PROPUESTAS_DE_NOMBRE) expect(propios).not.toContain(p.nombre.toLowerCase())
  })

  it('«trabaja con», «reporta a» y «eso lo hace» apuntan a agentes que existen', () => {
    for (const a of EQUIPO) {
      for (const id of a.trabajaCon) {
        expect(id).not.toBe(a.id)
        expect(agentePorId(id)).toBeDefined()
      }
      if (a.reportaA !== 'equipo') expect(agentePorId(a.reportaA)).toBeDefined()
      for (const i of a.noHace) if (i.loHace) expect(agentePorId(i.loHace)).toBeDefined()
    }
  })

  it('cada clave de despacho del micro es de un agente del equipo', () => {
    for (const k of DESPACHOS_DEL_MICRO) expect(agenteDelDespacho(k), k).not.toBeNull()
    expect(agenteDelDespacho('avaluo')?.id).toBe('avaluos')
    expect(agenteDelDespacho('cobranza')?.nombrePropio).toBe('Laura')
  })

  it('las claves que el front ya tipa también caen bien (o en null, nunca en otro)', () => {
    const delFront: BackendDispatchAgent[] = ['cobranza', 'cotizador', 'estudio', 'matching', 'avaluo', 'conciliacion', 'pagos', 'reportes', 'comunicacion']
    for (const k of delFront) expect(agenteDelDespacho(k)).not.toBeNull()
    // Categorías viejas del front que el micro no despacha: no se inventa dueño.
    const viejas: AgentType[] = ['pipeline', 'mantenimiento']
    for (const k of viejas) expect(agenteDelDespacho(k)).toBeNull()
    expect(agenteDelDespacho(undefined)).toBeNull()
  })

  it('el registro y la flota del piloto automático cuentan los mismos agentes', () => {
    const conAutonomia = EQUIPO.filter((a) => a.autonomia).map((a) => a.autonomia)
    expect([...conAutonomia].sort()).toEqual([...FLOTA_DEL_MICRO].sort())
    expect(agenteDeLaAutonomia('chat')?.id).toBe('orquestador')
    expect(agenteDeLaAutonomia('nadie')).toBeNull()
  })

  it('«lo llama el chat» sólo para quien tiene clave de despacho', () => {
    expect(loLlamaElChat(agentePorId('orquestador'))).toBe(true)
    expect(loLlamaElChat(agentePorId('cobranza'))).toBe(true)
    expect(loLlamaElChat(agentePorId('retencion'))).toBe(false)
    expect(loLlamaElChat(agentePorId('mantenimiento'))).toBe(false)
  })

  it('todo texto existe en español y en inglés', () => {
    const faltan: string[] = []
    for (const k of clavesDelEquipo()) {
      if (typeof valor(es, k) !== 'string') faltan.push(`es: ${k}`)
      if (typeof valor(en, k) !== 'string') faltan.push(`en: ${k}`)
    }
    expect(faltan).toEqual([])
  })

  it('las mismas claves en los dos idiomas (nada sobra en uno)', () => {
    const planas = (o: unknown, p = ''): string[] =>
      o && typeof o === 'object'
        ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => planas(v, p ? `${p}.${k}` : k))
        : [p]
    expect(planas((es as Record<string, unknown>).agentes).sort()).toEqual(planas((en as Record<string, unknown>).agentes).sort())
  })

  it('el nombre que se pinta: el propio, o el funcional traducido', () => {
    const t = (k: string) => String(valor(es, k) ?? k)
    expect(nombreDelAgente(agentePorId('pagos'), t)).toBe('Cobri')
    expect(nombreDelAgente(agentePorId('conciliacion'), t)).toBe('Conciliación')
  })

  /**
   * 🔴 «Chat» y «piloto automático» son cosas distintas (Nico, 29-09). En el
   * texto del equipo, «Piloto» con mayúscula (el nombre interno del chat) no
   * aparece, y «piloto» va siempre como «piloto automático».
   */
  it('no le dice «Piloto» al chat', () => {
    const textos = JSON.stringify((es as Record<string, unknown>).agentes)
    expect(textos).not.toMatch(/\bPiloto\b/)
    for (const m of textos.matchAll(/\bpiloto\b(?! automático)/g)) throw new Error(`«piloto» suelto: …${textos.slice(m.index! - 30, m.index! + 30)}…`)
  })
})
