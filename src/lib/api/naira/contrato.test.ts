/**
 * contrato.test.ts — el espejo zod de Naira (13-01, Tarea 1).
 *
 * Qué prueba: la tabla de endpoints es la del §3.1 fila por fila; las acciones de la tabla son exactamente las del
 * módulo; el modo tolerante QUITA lo que el agente agregue en todos los niveles (P4); el modo estricto es estricto en
 * TODOS los niveles (P2: el `.strict()` de zod 3 es superficial) salvo los dos nodos opacos declarados (P3); y los
 * campos enmendados por el agente (D13-23) son opcionales en el tolerante y requeridos en el estricto (P17).
 *
 * El marcador [N13:*] va en el TÍTULO de cada `it` (sale en la línea FAIL).
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as contrato from './contrato'
import {
  ACCIONES_DE_NAIRA,
  ENDPOINTS_DE_NAIRA,
  ESQUEMAS_ESTRICTOS_DE_NAIRA,
  IDS_DE_ENDPOINT,
  NAIRA_BASE,
  NODOS_OPACOS_DE_NAIRA,
  NairaOpenLoopEventSchema,
  RAZON_NAIRA_NO_HABILITADA,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  RESPUESTA_TOLERANTE_POR_ENDPOINT,
  type IdDeEndpoint,
} from './contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

/** La tabla del §3.1 del CONTEXT copiada a mano (no se deriva del código que prueba). */
const TABLA_DEL_CONTEXTO: readonly (readonly [IdDeEndpoint, 'GET' | 'POST', string, readonly string[], 'EXISTE' | 'PLANIFICADO', 'apagada' | 'no_encontrado'])[] = [
  ['memoria.vista', 'GET', '/memory', ['memory-view'], 'EXISTE', 'apagada'],
  ['memoria.corregir', 'POST', '/memory/items/{itemId}/correction', ['memory-correct'], 'EXISTE', 'no_encontrado'],
  ['memoria.borrar', 'POST', '/memory/items/{itemId}/erasure', ['memory-erase'], 'EXISTE', 'no_encontrado'],
  ['memoria.resolverPropuesta', 'POST', '/memory/procedural/proposals/{proposalId}/resolution', ['procedural-approve'], 'EXISTE', 'no_encontrado'],
  ['memoria.promover', 'POST', '/memory/items/{itemId}/promotion', ['memory-promote'], 'PLANIFICADO', 'no_encontrado'],
  ['conversacion.preguntar', 'POST', '/conversation/questions', ['conversation-ask'], 'PLANIFICADO', 'apagada'],
  ['briefing.dia', 'GET', '/briefing', ['briefing-view'], 'PLANIFICADO', 'apagada'],
  ['senal.detalle', 'GET', '/signals/{promocionId}', ['signal-view'], 'PLANIFICADO', 'no_encontrado'],
  ['recall.responder', 'POST', '/recall', ['recall-answer'], 'PLANIFICADO', 'apagada'],
  ['senal.voto', 'POST', '/signals/{promocionId}/feedback', ['signal-feedback'], 'PLANIFICADO', 'no_encontrado'],
  ['seguimiento.lista', 'GET', '/open-loops', ['open-loops-view'], 'PLANIFICADO', 'apagada'],
  ['seguimiento.detalle', 'GET', '/open-loops/{loopId}', ['open-loops-view'], 'PLANIFICADO', 'no_encontrado'],
  ['acciones.lista', 'GET', '/actions', ['action-view'], 'PLANIFICADO', 'apagada'],
  ['acciones.detalle', 'GET', '/actions/{proposalId}', ['action-view'], 'PLANIFICADO', 'no_encontrado'],
  ['acciones.decidir', 'POST', '/actions/{proposalId}/decision', ['action-approve-internal', 'action-approve-external'], 'PLANIFICADO', 'no_encontrado'],
  ['tareas.lista', 'GET', '/tasks', ['task-view'], 'PLANIFICADO', 'apagada'],
  ['tareas.cancelar', 'POST', '/tasks/{tareaId}/cancel', ['task-cancel'], 'PLANIFICADO', 'no_encontrado'],
  // P2 (Nico, 15-10-2026): el consentimiento de WhatsApp del briefing, de quien llama.
  ['whatsapp.consentimiento', 'GET', '/whatsapp-consent', ['notify-preferences-edit'], 'EXISTE', 'apagada'],
  ['whatsapp.consentir', 'POST', '/whatsapp-consent', ['notify-preferences-edit'], 'EXISTE', 'apagada'],
]

/** Una copia profunda de un ejemplo (JSON: los ejemplos son datos planos). */
function copia<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

/** Una copia del ejemplo como registro mutable, para agregar o quitar claves. */
function registro(x: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(x)) as Record<string, unknown>
}

/**
 * Junta, por INSTANCIA, todo ZodObject alcanzable desde las raíces (zod 3: shape, element, options, unwrap, innerType).
 * Devuelve también cuántos nodos recorrió, para que un recorrido vacío no pase por verde.
 */
function objetosDelArbol(raices: readonly z.ZodTypeAny[]): Set<z.AnyZodObject> {
  const vistos = new Set<z.ZodTypeAny>()
  const objetos = new Set<z.AnyZodObject>()
  const pendientes: z.ZodTypeAny[] = [...raices]
  while (pendientes.length > 0) {
    const nodo = pendientes.pop()
    if (nodo === undefined || vistos.has(nodo)) continue
    vistos.add(nodo)
    if (nodo instanceof z.ZodObject) {
      objetos.add(nodo)
      for (const hijo of Object.values(nodo.shape as z.ZodRawShape)) pendientes.push(hijo)
    } else if (nodo instanceof z.ZodArray) {
      pendientes.push(nodo.element)
    } else if (nodo instanceof z.ZodDiscriminatedUnion || nodo instanceof z.ZodUnion) {
      for (const opcion of nodo.options as readonly z.ZodTypeAny[]) pendientes.push(opcion)
    } else if (nodo instanceof z.ZodOptional || nodo instanceof z.ZodNullable) {
      pendientes.push(nodo.unwrap())
    } else if (nodo instanceof z.ZodEffects) {
      pendientes.push(nodo.innerType())
    }
  }
  return objetos
}

function modoDe(o: z.AnyZodObject): string {
  return String(o._def.unknownKeys)
}

/** Las raíces tolerantes: todo `<N>Schema` exportado + el mapa de respuestas de ejecución. */
function raicesTolerantes(): z.ZodTypeAny[] {
  const exportados = Object.entries(contrato)
    .filter(([nombre, valor]) => nombre.endsWith('Schema') && valor instanceof z.ZodType)
    .map(([, valor]) => valor as z.ZodTypeAny)
  return [...exportados, ...Object.values(RESPUESTA_TOLERANTE_POR_ENDPOINT)]
}

function raicesEstrictas(): z.ZodTypeAny[] {
  return [...Object.values(ESQUEMAS_ESTRICTOS_DE_NAIRA), ...Object.values(RESPUESTA_ESTRICTA_POR_ENDPOINT)]
}

describe('ENDPOINTS_DE_NAIRA — la tabla del §3.1', () => {
  it('[N13:endpoints-tabla] cada fila es igual a la tabla del CONTEXT (id, método, ruta, acciones, estado, si404)', () => {
    expect(NAIRA_BASE).toBe('/api/agency/{agencyId}/naira')
    expect(IDS_DE_ENDPOINT).toEqual(TABLA_DEL_CONTEXTO.map((f) => f[0]))
    expect(Object.keys(ENDPOINTS_DE_NAIRA).sort()).toEqual([...IDS_DE_ENDPOINT].sort())
    for (const [id, metodo, ruta, acciones, estado, si404] of TABLA_DEL_CONTEXTO) {
      const fila = ENDPOINTS_DE_NAIRA[id]
      expect({ id: fila.id, metodo: fila.metodo, ruta: fila.ruta, acciones: [...fila.acciones], estado: fila.estado, si404: fila.si404 }).toEqual({
        id,
        metodo,
        ruta,
        acciones: [...acciones],
        estado,
        si404,
      })
      expect(typeof fila.fuente).toBe('string')
      expect(fila.fuente.trim().length).toBeGreaterThan(0)
    }
  })

  it('[N13:acciones-bicondicional] las acciones de las 19 filas son EXACTAMENTE ACCIONES_DE_NAIRA, sin repetidas', () => {
    const deLaTabla = new Set<string>()
    for (const id of IDS_DE_ENDPOINT) for (const a of ENDPOINTS_DE_NAIRA[id].acciones) deLaTabla.add(a)
    const delModulo = new Set<string>(ACCIONES_DE_NAIRA)
    expect(delModulo.size).toBe(ACCIONES_DE_NAIRA.length)
    for (const a of deLaTabla) expect(delModulo.has(a), a).toBe(true)
    for (const a of delModulo) expect(deLaTabla.has(a), a).toBe(true)
    expect(deLaTabla.size).toBe(17)
  })
})

describe('modo tolerante (ejecución) — quita lo agregado en todos los niveles (P4)', () => {
  it.each(IDS_DE_ENDPOINT)('[N13:parseo-tolerante] %s: una clave de más arriba se acepta y NO llega al resultado', (id) => {
    const conExtra = { ...registro(EJEMPLOS_DE_NAIRA[id]), campoAgregadoPorElAgente: 1 }
    const r = RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(conExtra)
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    if (r.success) expect(JSON.stringify(r.data)).not.toContain('campoAgregadoPorElAgente')
  })

  it('[N13:parseo-tolerante] memoria.vista: una clave agregada dentro de un ítem y de su contenido se quita', () => {
    const vista = copia(EJEMPLOS_DE_NAIRA['memoria.vista'])
    const crudo = registro(vista)
    const items = crudo.items as Record<string, unknown>[]
    items[0].campoAgregado = 'x'
    ;(items[0].content as Record<string, unknown>).campoAgregado = 'y'
    const r = RESPUESTA_TOLERANTE_POR_ENDPOINT['memoria.vista'].safeParse(crudo)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(JSON.stringify(r.data)).not.toContain('campoAgregado')
      expect(r.data.items.length).toBe(vista.items.length)
    }
  })
})

describe('modo estricto (tests) — estricto en TODOS los niveles (P2)', () => {
  it('[N13:estricto-profundo] (a) todo ZodObject del árbol estricto es strict y todo el tolerante es strip, salvo los dos opacos', () => {
    const opacosEstrictos = new Set<z.AnyZodObject>([
      ESQUEMAS_ESTRICTOS_DE_NAIRA.NairaOpenLoopEvent.shape.memoria,
      ESQUEMAS_ESTRICTOS_DE_NAIRA.NairaOpenLoopEvent.shape.verificacion,
    ])
    const estrictos = objetosDelArbol(raicesEstrictas())
    expect(estrictos.size).toBeGreaterThan(60)
    const noEstrictos = [...estrictos].filter((o) => !opacosEstrictos.has(o) && modoDe(o) !== 'strict')
    expect(noEstrictos.map((o) => Object.keys(o.shape as z.ZodRawShape).join(','))).toEqual([])

    const opacosTolerantes = new Set<z.AnyZodObject>([NairaOpenLoopEventSchema.shape.memoria, NairaOpenLoopEventSchema.shape.verificacion])
    const tolerantes = objetosDelArbol(raicesTolerantes())
    expect(tolerantes.size).toBeGreaterThan(60)
    const noStrip = [...tolerantes].filter((o) => !opacosTolerantes.has(o) && modoDe(o) !== 'strip')
    expect(noStrip.map((o) => Object.keys(o.shape as z.ZodRawShape).join(','))).toEqual([])
    // Ningún objeto es de los dos árboles a la vez (son dos construcciones distintas del MISMO árbol).
    for (const o of tolerantes) expect(estrictos.has(o)).toBe(false)
  })

  it('[N13:estricto-profundo] (b) el estricto RECHAZA un campo inventado en un nivel profundo', () => {
    const vista = registro(EJEMPLOS_DE_NAIRA['memoria.vista'])
    const contenido = (vista.items as Record<string, unknown>[])[0].content as Record<string, unknown>
    contenido.inventado = 1
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista'].safeParse(vista).success).toBe(false)
    expect(RESPUESTA_TOLERANTE_POR_ENDPOINT['memoria.vista'].safeParse(vista).success).toBe(true)

    const detalle = registro(EJEMPLOS_DE_NAIRA['acciones.detalle'])
    const senal = (detalle.razonamiento as Record<string, unknown>).senal as Record<string, unknown>
    senal.inventado = 1
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.detalle'].safeParse(detalle).success).toBe(false)
    expect(RESPUESTA_TOLERANTE_POR_ENDPOINT['acciones.detalle'].safeParse(detalle).success).toBe(true)
  })

  it('[N13:opacos-declarados] los únicos objetos passthrough son NairaOpenLoopEvent.memoria y .verificacion', () => {
    expect(NODOS_OPACOS_DE_NAIRA).toEqual(['NairaOpenLoopEvent.memoria', 'NairaOpenLoopEvent.verificacion'])
    const passTolerante = [...objetosDelArbol(raicesTolerantes())].filter((o) => modoDe(o) === 'passthrough')
    expect(new Set(passTolerante)).toEqual(new Set([NairaOpenLoopEventSchema.shape.memoria, NairaOpenLoopEventSchema.shape.verificacion]))
    expect(passTolerante.length).toBe(2)
    const passEstricto = [...objetosDelArbol(raicesEstrictas())].filter((o) => modoDe(o) === 'passthrough')
    expect(passEstricto.length).toBe(2)
    expect(new Set(passEstricto)).toEqual(
      new Set([ESQUEMAS_ESTRICTOS_DE_NAIRA.NairaOpenLoopEvent.shape.memoria, ESQUEMAS_ESTRICTOS_DE_NAIRA.NairaOpenLoopEvent.shape.verificacion]),
    )
  })
})

describe('campos enmendados por el agente (D13-23, P17)', () => {
  type Caso = { readonly id: IdDeEndpoint; readonly campo: string; readonly quitar: (x: Record<string, unknown>) => void }
  const primerItemDelBriefing = (x: Record<string, unknown>): Record<string, unknown> => {
    const resultado = x.resultado as Record<string, unknown>
    const entregas = resultado.entregas as Record<string, unknown>[]
    return (entregas[0].items as Record<string, unknown>[])[0]
  }
  const CASOS: readonly Caso[] = [
    { id: 'briefing.dia', campo: 'valorRenderizado', quitar: (x) => delete primerItemDelBriefing(x).valorRenderizado },
    { id: 'briefing.dia', campo: 'nombreDeMetrica', quitar: (x) => delete primerItemDelBriefing(x).nombreDeMetrica },
    { id: 'senal.detalle', campo: 'causa.citasConClase', quitar: (x) => delete (x.causa as Record<string, unknown>).citasConClase },
    { id: 'conversacion.preguntar', campo: 'oraciones', quitar: (x) => delete x.oraciones },
    { id: 'conversacion.preguntar', campo: 'refs', quitar: (x) => delete x.refs },
    { id: 'acciones.lista', campo: 'acciones[0].asOfs', quitar: (x) => delete (x.acciones as Record<string, unknown>[])[0].asOfs },
  ]

  it.each(CASOS)('[N13:enmiendas-opcionales] $id sin $campo: el tolerante lo acepta y el estricto lo rechaza', ({ id, quitar }) => {
    const sin = registro(EJEMPLOS_DE_NAIRA[id])
    const antes = JSON.stringify(sin)
    quitar(sin)
    expect(JSON.stringify(sin)).not.toBe(antes) // el campo estaba en el ejemplo y se quitó
    expect(RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(sin).success).toBe(true)
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT[id].safeParse(sin).success).toBe(false)
  })

  it('[N13:enmiendas-opcionales] la razón del 404 de «apagada» es la del agente (E13-7)', () => {
    expect(RAZON_NAIRA_NO_HABILITADA).toBe('naira_no_habilitada')
  })
})

describe('control positivo', () => {
  it.each(IDS_DE_ENDPOINT)('[N13:control-positivo] %s: el estricto y el tolerante aceptan el ejemplo tal cual', (id) => {
    const estricto = RESPUESTA_ESTRICTA_POR_ENDPOINT[id].safeParse(EJEMPLOS_DE_NAIRA[id])
    expect(estricto.success, JSON.stringify(estricto.success ? null : estricto.error.issues)).toBe(true)
    const tolerante = RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(EJEMPLOS_DE_NAIRA[id])
    expect(tolerante.success).toBe(true)
    if (tolerante.success) expect(tolerante.data).toEqual(EJEMPLOS_DE_NAIRA[id])
  })
})
