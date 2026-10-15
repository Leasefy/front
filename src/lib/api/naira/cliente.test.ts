/**
 * cliente.test.ts — el cliente de Naira (13-01, Tarea 2).
 *
 * Qué prueba: cada una de las 17 funciones pega a la URL exacta con el método y el cuerpo exactos; cada código se
 * traduce a su estado cerrado (403 con o sin `reason` ⇒ sin datos; 404 por razón y por fila; 409; 400/422 sin eco;
 * resto ⇒ no disponible; 200 roto ⇒ nada); el simulado se decide SOLO por la guarda de config.ts, antes de la red y
 * nunca en producción; nada tira; y el módulo de ejemplos solo lo importa este cliente.
 *
 * `agentFetch` se reemplaza con `vi.mock` (el transporte único); el `fetch` global es un espía que NUNCA debe llamarse.
 * El marcador [N13:*] va en el TÍTULO de cada `it`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const agentFetchMock = vi.fn()
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetchMock(...a) }))

import * as cliente from './cliente'
import { KINDS_DE_ESTADO_NAIRA, type EstadoNaira } from './cliente'
import { ENDPOINTS_DE_NAIRA, RESPUESTA_TOLERANTE_POR_ENDPOINT, type IdDeEndpoint } from './contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

const AGENCIA = 'AGY-1'
const BASE = 'https://agente.test/api/agency/AGY-1/naira'
/** Un id con `/` y `?`: si no se codifica, cambia el endpoint. */
const RARO = 'x/../y?z=1'
const R = encodeURIComponent(RARO)

type Llamada = {
  readonly nombre: string
  readonly id: IdDeEndpoint
  readonly llamar: () => Promise<EstadoNaira<unknown>>
  readonly url: string
  readonly metodo: 'GET' | 'POST'
  readonly cuerpo: Readonly<Record<string, unknown>> | null
}

/** Escrita a mano: un cambio de ruta en la tabla del contrato NO se autocorrige aquí. */
const LLAMADAS: readonly Llamada[] = [
  { nombre: 'leerMemoria', id: 'memoria.vista', llamar: () => cliente.leerMemoria(AGENCIA), url: BASE + '/memory', metodo: 'GET', cuerpo: null },
  {
    nombre: 'corregirItem',
    id: 'memoria.corregir',
    llamar: () => cliente.corregirItem(AGENCIA, RARO, 'Texto corregido'),
    url: BASE + '/memory/items/' + R + '/correction',
    metodo: 'POST',
    cuerpo: { text: 'Texto corregido' },
  },
  {
    nombre: 'borrarItem',
    id: 'memoria.borrar',
    llamar: () => cliente.borrarItem(AGENCIA, RARO, 'solicitud_del_titular'),
    url: BASE + '/memory/items/' + R + '/erasure',
    metodo: 'POST',
    cuerpo: { motivo: 'solicitud_del_titular' },
  },
  {
    nombre: 'resolverPropuestaProcedural',
    id: 'memoria.resolverPropuesta',
    llamar: () => cliente.resolverPropuestaProcedural(AGENCIA, RARO, 'reject'),
    url: BASE + '/memory/procedural/proposals/' + R + '/resolution',
    metodo: 'POST',
    cuerpo: { decision: 'reject' },
  },
  {
    nombre: 'promoverItem',
    id: 'memoria.promover',
    llamar: () => cliente.promoverItem(AGENCIA, RARO),
    url: BASE + '/memory/items/' + R + '/promotion',
    metodo: 'POST',
    cuerpo: null,
  },
  {
    nombre: 'preguntarANaira',
    id: 'conversacion.preguntar',
    llamar: () => cliente.preguntarANaira(AGENCIA, '¿Cómo va la cartera?'),
    url: BASE + '/conversation/questions',
    metodo: 'POST',
    cuerpo: { question: '¿Cómo va la cartera?' },
  },
  { nombre: 'leerBriefing sin día', id: 'briefing.dia', llamar: () => cliente.leerBriefing(AGENCIA), url: BASE + '/briefing', metodo: 'GET', cuerpo: null },
  {
    nombre: 'leerBriefing con día',
    id: 'briefing.dia',
    llamar: () => cliente.leerBriefing(AGENCIA, '2000-01-03'),
    url: BASE + '/briefing?dia=2000-01-03',
    metodo: 'GET',
    cuerpo: null,
  },
  { nombre: 'leerSenal', id: 'senal.detalle', llamar: () => cliente.leerSenal(AGENCIA, RARO), url: BASE + '/signals/' + R, metodo: 'GET', cuerpo: null },
  {
    nombre: 'responderRecall',
    id: 'recall.responder',
    llamar: () => cliente.responderRecall(AGENCIA, { semana: '2000-01-03', texto: 'Respuesta semanal' }),
    url: BASE + '/recall',
    metodo: 'POST',
    cuerpo: { semana: '2000-01-03', texto: 'Respuesta semanal' },
  },
  {
    nombre: 'votarSenal',
    id: 'senal.voto',
    llamar: () => cliente.votarSenal(AGENCIA, RARO, 'util'),
    url: BASE + '/signals/' + R + '/feedback',
    metodo: 'POST',
    cuerpo: { valor: 'util' },
  },
  { nombre: 'leerSeguimiento', id: 'seguimiento.lista', llamar: () => cliente.leerSeguimiento(AGENCIA), url: BASE + '/open-loops', metodo: 'GET', cuerpo: null },
  { nombre: 'leerLoop', id: 'seguimiento.detalle', llamar: () => cliente.leerLoop(AGENCIA, RARO), url: BASE + '/open-loops/' + R, metodo: 'GET', cuerpo: null },
  { nombre: 'leerPropuestas', id: 'acciones.lista', llamar: () => cliente.leerPropuestas(AGENCIA), url: BASE + '/actions', metodo: 'GET', cuerpo: null },
  { nombre: 'leerPropuesta', id: 'acciones.detalle', llamar: () => cliente.leerPropuesta(AGENCIA, RARO), url: BASE + '/actions/' + R, metodo: 'GET', cuerpo: null },
  {
    nombre: 'decidirPropuesta',
    id: 'acciones.decidir',
    llamar: () => cliente.decidirPropuesta(AGENCIA, RARO, { decision: 'aprobar', huellaVista: 'abc123' }),
    url: BASE + '/actions/' + R + '/decision',
    metodo: 'POST',
    cuerpo: { decision: 'aprobar', huellaVista: 'abc123' },
  },
  { nombre: 'leerTareas', id: 'tareas.lista', llamar: () => cliente.leerTareas(AGENCIA), url: BASE + '/tasks', metodo: 'GET', cuerpo: null },
  {
    nombre: 'cancelarTarea',
    id: 'tareas.cancelar',
    llamar: () => cliente.cancelarTarea(AGENCIA, RARO),
    url: BASE + '/tasks/' + R + '/cancel',
    metodo: 'POST',
    cuerpo: null,
  },
]

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
}

function crudo(status: number, texto: string | null): Response {
  return new Response(texto, { status })
}

function copia(x: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(x)) as Record<string, unknown>
}

function parseado(id: IdDeEndpoint): unknown {
  const r = RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(EJEMPLOS_DE_NAIRA[id])
  if (!r.success) throw new Error('el ejemplo de ' + id + ' no parsea')
  return r.data
}

let espiaDelFetchGlobal = vi.fn()
let llamadasAlFetchGlobal = 0

beforeEach(() => {
  agentFetchMock.mockReset()
  espiaDelFetchGlobal = vi.fn()
  vi.stubGlobal('fetch', espiaDelFetchGlobal)
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'https://agente.test')
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', '')
  vi.stubEnv('NODE_ENV', 'test')
})

afterEach(() => {
  llamadasAlFetchGlobal += espiaDelFetchGlobal.mock.calls.length
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('transporte — URL, método y cuerpo exactos', () => {
  it.each(LLAMADAS)('[N13:ruta-exacta] $nombre pega a su URL con su método y su cuerpo', async (l) => {
    agentFetchMock.mockResolvedValue(json(200, EJEMPLOS_DE_NAIRA[l.id]))
    const estado = await l.llamar()
    expect(estado.kind).toBe('ok')
    expect(agentFetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(l.url)
    expect(init.method).toBe(l.metodo)
    if (l.cuerpo === null) {
      expect(init.body).toBeUndefined()
    } else {
      expect(JSON.parse(String(init.body))).toEqual(l.cuerpo)
      expect(init.headers).toEqual({ 'content-type': 'application/json' })
    }
  })
})

describe('códigos ⇒ estados cerrados', () => {
  it.each(LLAMADAS)('[N13:404-por-endpoint] $nombre: 404 sin la razón de E13-7 ⇒ el si404 de su fila', async (l) => {
    const esperado = { kind: ENDPOINTS_DE_NAIRA[l.id].si404 }
    agentFetchMock.mockResolvedValueOnce(json(404, { error: 'x', reason: null }))
    expect(await l.llamar()).toEqual(esperado)
    agentFetchMock.mockResolvedValueOnce(crudo(404, null))
    expect(await l.llamar()).toEqual(esperado)
  })

  it.each(LLAMADAS)('[N13:404-por-razon] $nombre: 404 con naira_no_habilitada ⇒ apagada; otra razón ⇒ su si404', async (l) => {
    agentFetchMock.mockResolvedValueOnce(json(404, { error: 'x', reason: 'naira_no_habilitada' }))
    expect(await l.llamar()).toEqual({ kind: 'apagada' })
    agentFetchMock.mockResolvedValueOnce(json(404, { error: 'x', reason: 'acciones_apagadas' }))
    expect(await l.llamar()).toEqual({ kind: ENDPOINTS_DE_NAIRA[l.id].si404 })
    agentFetchMock.mockResolvedValueOnce(json(404, { error: 'x', reason: 'no_entregado' }))
    expect(await l.llamar()).toEqual({ kind: ENDPOINTS_DE_NAIRA[l.id].si404 })
  })

  it.each(LLAMADAS)('[N13:403-sin-reason] $nombre: 403 con o sin reason, o sin JSON ⇒ sin_permiso y nada más', async (l) => {
    agentFetchMock.mockResolvedValueOnce(json(403, { error: 'Forbidden — insufficient role' }))
    expect(await l.llamar()).toEqual({ kind: 'sin_permiso' })
    agentFetchMock.mockResolvedValueOnce(json(403, { error: 'x', reason: 'sin_permiso_de_la_clase' }))
    expect(await l.llamar()).toEqual({ kind: 'sin_permiso' })
    agentFetchMock.mockResolvedValueOnce(crudo(403, '<html>prohibido</html>'))
    expect(await l.llamar()).toEqual({ kind: 'sin_permiso' })
  })

  it.each(LLAMADAS)('[N13:contrato-roto-sin-datos] $nombre: 200 que no parsea ⇒ contrato_roto sin un solo campo', async (l) => {
    const roto = copia(EJEMPLOS_DE_NAIRA[l.id])
    const primera = Object.keys(roto)[0]
    delete roto[primera]
    agentFetchMock.mockResolvedValueOnce(json(200, roto))
    const estado = await l.llamar()
    expect(estado.kind).toBe('contrato_roto')
    expect(Object.keys(estado)).toEqual(['kind'])
    agentFetchMock.mockResolvedValueOnce(crudo(200, 'no es json'))
    const sinJson = await l.llamar()
    expect(sinJson).toEqual({ kind: 'contrato_roto' })
  })

  it('[N13:parseo-tolerante] 200 con claves agregadas arriba y anidadas ⇒ ok, y ninguna llega a data', async () => {
    const vista = copia(EJEMPLOS_DE_NAIRA['memoria.vista'])
    vista.campoArriba = 'ARRIBA-AGREGADO'
    ;(vista.items as Record<string, unknown>[])[0].campoAnidado = 'ANIDADO-AGREGADO'
    agentFetchMock.mockResolvedValueOnce(json(200, vista))
    const estado = await cliente.leerMemoria(AGENCIA)
    expect(estado.kind).toBe('ok')
    expect(JSON.stringify(estado)).not.toContain('ARRIBA-AGREGADO')
    expect(JSON.stringify(estado)).not.toContain('ANIDADO-AGREGADO')

    const detalle = copia(EJEMPLOS_DE_NAIRA['acciones.detalle'])
    detalle.approvedBy = 'ARRIBA-AGREGADO'
    ;((detalle.razonamiento as Record<string, unknown>).senal as Record<string, unknown>).userId = 'ANIDADO-AGREGADO'
    agentFetchMock.mockResolvedValueOnce(json(200, detalle))
    const estadoDetalle = await cliente.leerPropuesta(AGENCIA, 'p-1')
    expect(estadoDetalle.kind).toBe('ok')
    expect(JSON.stringify(estadoDetalle)).not.toContain('AGREGADO')
  })

  it('[N13:ok-origen-agente] [N13:control-positivo] 200 con el ejemplo de la memoria ⇒ ok, origen agente, data = el ejemplo parseado', async () => {
    agentFetchMock.mockResolvedValueOnce(json(200, EJEMPLOS_DE_NAIRA['memoria.vista']))
    const estado = await cliente.leerMemoria(AGENCIA)
    expect(estado).toEqual({ kind: 'ok', origen: 'agente', data: parseado('memoria.vista') })
    expect(JSON.stringify(estado)).toContain('(ejemplo)')
  })

  it('[N13:conflicto-y-rechazo] 409 ⇒ conflicto con su razón; 400 y 422 ⇒ rechazado con su razón o null', async () => {
    const decidir = () => cliente.decidirPropuesta(AGENCIA, 'p-1', { decision: 'rechazar', huellaVista: 'h' })
    agentFetchMock.mockResolvedValueOnce(json(409, { error: 'Conflicto', reason: 'huella_distinta' }))
    expect(await decidir()).toEqual({ kind: 'conflicto', razon: 'huella_distinta' })
    agentFetchMock.mockResolvedValueOnce(json(409, { error: 'Conflicto' }))
    expect(await decidir()).toEqual({ kind: 'conflicto', razon: null })
    agentFetchMock.mockResolvedValueOnce(json(422, { error: 'Contenido rechazado', reason: 'contiene_telefono' }))
    expect(await cliente.corregirItem(AGENCIA, 'i-1', 'hola')).toEqual({ kind: 'rechazado', razon: 'contiene_telefono' })
    agentFetchMock.mockResolvedValueOnce(json(400, { error: 'Cuerpo inválido', reason: null }))
    expect(await cliente.corregirItem(AGENCIA, 'i-1', 'hola')).toEqual({ kind: 'rechazado', razon: null })
    agentFetchMock.mockResolvedValueOnce(crudo(400, null))
    expect(await cliente.corregirItem(AGENCIA, 'i-1', 'hola')).toEqual({ kind: 'rechazado', razon: null })
  })

  it('[N13:razon-sin-eco] el error del agente (con el texto de la persona) nunca llega al estado', async () => {
    agentFetchMock.mockResolvedValueOnce(json(422, { error: 'TEXTO-DEL-USUARIO-123', reason: 'contiene_telefono' }))
    const estado = await cliente.corregirItem(AGENCIA, 'i-1', 'TEXTO-DEL-USUARIO-123')
    expect(estado.kind).toBe('rechazado')
    expect(JSON.stringify(estado)).not.toContain('TEXTO-DEL-USUARIO-123')
    agentFetchMock.mockResolvedValueOnce(json(409, { error: 'TEXTO-DEL-USUARIO-123', reason: 'ya_decidida' }))
    expect(JSON.stringify(await cliente.decidirPropuesta(AGENCIA, 'p', { decision: 'aprobar', huellaVista: 'h' }))).not.toContain('TEXTO-DEL-USUARIO-123')
  })

  it.each([503, 500, 502, 429, 418, 401])('[N13:no-disponible] %i ⇒ no_disponible', async (status) => {
    agentFetchMock.mockResolvedValueOnce(json(status, { error: 'x', reason: 'algo' }))
    expect(await cliente.leerMemoria(AGENCIA)).toEqual({ kind: 'no_disponible' })
  })

  it.each(LLAMADAS)('[N13:no-disponible] $nombre: 503 ⇒ no_disponible', async (l) => {
    agentFetchMock.mockResolvedValueOnce(json(503, { error: 'Database unavailable', reason: null }))
    expect(await l.llamar()).toEqual({ kind: 'no_disponible' })
  })

  it.each(LLAMADAS)('[N13:red-no-simula] $nombre: la red falla con el simulado apagado ⇒ no_disponible, nunca un ejemplo', async (l) => {
    agentFetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const estado = await l.llamar()
    expect(estado).toEqual({ kind: 'no_disponible' })
    expect(JSON.stringify(estado)).not.toContain('ejemplo')
  })

  it.each(LLAMADAS)('[N13:nunca-tira] $nombre: ningún caso rechaza la promesa', async (l) => {
    const casos: (() => void)[] = [
      () => agentFetchMock.mockResolvedValueOnce(json(403, {})),
      () => agentFetchMock.mockResolvedValueOnce(crudo(404, '{roto')),
      () => agentFetchMock.mockResolvedValueOnce(json(409, null)),
      () => agentFetchMock.mockResolvedValueOnce(json(422, 'texto')),
      () => agentFetchMock.mockResolvedValueOnce(json(500, {})),
      () => agentFetchMock.mockRejectedValueOnce(new Error('red')),
      () =>
        agentFetchMock.mockImplementationOnce(() => {
          throw new Error('síncrono')
        }),
      () => agentFetchMock.mockResolvedValueOnce(crudo(200, 'no es json')),
      () => agentFetchMock.mockResolvedValueOnce(json(200, null)),
      () => agentFetchMock.mockResolvedValueOnce(json(200, EJEMPLOS_DE_NAIRA[l.id])),
    ]
    for (const preparar of casos) {
      preparar()
      await expect(l.llamar()).resolves.toHaveProperty('kind')
    }
  })
})

describe('pedidos inválidos — sin red', () => {
  it('[N13:pedido-invalido-sin-red] un cuerpo que no pasa su esquema ⇒ rechazado pedido_invalido y agentFetch no se llama', async () => {
    const invalido = { kind: 'rechazado', razon: 'pedido_invalido' }
    expect(await cliente.corregirItem(AGENCIA, 'i-1', '')).toEqual(invalido)
    expect(await cliente.corregirItem(AGENCIA, 'i-1', 'a'.repeat(4001))).toEqual(invalido)
    expect(await cliente.preguntarANaira(AGENCIA, '')).toEqual(invalido)
    expect(await cliente.responderRecall(AGENCIA, { semana: 'ayer', texto: 'hola' })).toEqual(invalido)
    expect(await cliente.decidirPropuesta(AGENCIA, 'p-1', { decision: 'aprobar', huellaVista: '' })).toEqual(invalido)
    expect(await cliente.leerSenal(AGENCIA, '')).toEqual({ kind: 'no_encontrado' })
    expect(await cliente.leerMemoria('')).toEqual({ kind: 'no_disponible' })
    expect(agentFetchMock).not.toHaveBeenCalled()
    // control positivo: el mismo cuerpo con un texto válido sí sale a la red
    agentFetchMock.mockResolvedValueOnce(json(200, EJEMPLOS_DE_NAIRA['memoria.corregir']))
    expect((await cliente.corregirItem(AGENCIA, 'i-1', 'hola')).kind).toBe('ok')
    expect(agentFetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('modo simulado — solo por la guarda de config.ts, antes de la red', () => {
  it('[N13:simulado-nunca-en-prod] en producción, aun con el opt-in, se va a la red; sin URL ⇒ no_disponible', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const deLaRed = copia(EJEMPLOS_DE_NAIRA['memoria.vista'])
    ;((deLaRed.items as Record<string, unknown>[])[0].content as Record<string, unknown>).text = 'TOKEN-DE-LA-RED'
    agentFetchMock.mockResolvedValueOnce(json(200, deLaRed))
    const estado = await cliente.leerMemoria(AGENCIA)
    expect(agentFetchMock).toHaveBeenCalledTimes(1)
    expect(estado.kind).toBe('ok')
    if (estado.kind === 'ok') expect(estado.origen).toBe('agente')
    expect(JSON.stringify(estado)).toContain('TOKEN-DE-LA-RED')

    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    expect(await cliente.leerMemoria(AGENCIA)).toEqual({ kind: 'no_disponible' })
    expect(agentFetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(LLAMADAS)('[N13:origen-ejemplo] $nombre: con el opt-in fuera de producción ⇒ su ejemplo, origen ejemplo, sin red', async (l) => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const estado = await l.llamar()
    expect(estado).toEqual({ kind: 'ok', origen: 'ejemplo', data: parseado(l.id) })
    expect(agentFetchMock).not.toHaveBeenCalled()
    if (estado.kind === 'ok') expect(estado.data).not.toBe(EJEMPLOS_DE_NAIRA[l.id])
  })

  it.each(LLAMADAS)('[N13:sin-url-no-disponible] $nombre: simulado apagado y sin URL ⇒ no_disponible sin red', async (l) => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    expect(await l.llamar()).toEqual({ kind: 'no_disponible' })
    expect(agentFetchMock).not.toHaveBeenCalled()
  })
})

// Recorre todo `src`: bajo la suite completa pasa de los 5 s por defecto (lo mismo que arquitectura-del-panel.test.ts).
describe('guardias estáticas', { timeout: 60_000 }, () => {
  function archivosDe(dir: string): string[] {
    const salida: string[] = []
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) salida.push(...archivosDe(ruta))
      else if (/\.(ts|tsx)$/.test(entrada.name)) salida.push(ruta)
    }
    return salida
  }

  it('[N13:mock-solo-desde-cliente] el único archivo no-test que importa los ejemplos es cliente.ts', () => {
    const raiz = process.cwd()
    const importadores = archivosDe(join(raiz, 'src'))
      .filter((p) => !/\.test\.tsx?$/.test(p))
      .filter((p) => readFileSync(p, 'utf8').includes("mock-naira'"))
      .map((p) => relative(raiz, p).split('\\').join('/'))
      .sort()
    expect(importadores).toEqual(['src/lib/api/naira/cliente.ts'])
  })

  it('[N13:kinds-cerrados] los kinds del tipo EstadoNaira son exactamente KINDS_DE_ESTADO_NAIRA', () => {
    const TODOS: Record<EstadoNaira<unknown>['kind'], true> = {
      ok: true,
      sin_permiso: true,
      apagada: true,
      no_encontrado: true,
      conflicto: true,
      rechazado: true,
      no_disponible: true,
      contrato_roto: true,
    }
    expect(Object.keys(TODOS).sort()).toEqual([...KINDS_DE_ESTADO_NAIRA].sort())
  })

  it('[N13:un-solo-transporte] el cliente solo habla por agentFetch; el fetch global nunca se llamó en este archivo', () => {
    const codigo = readFileSync(join(process.cwd(), 'src/lib/api/naira/cliente.ts'), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')
    expect(codigo).toContain('agentFetch(')
    expect(codigo).not.toMatch(/(^|[^A-Za-z_.])fetch\(/m)
    expect(codigo).not.toContain('globalThis.fetch')
    expect(codigo).not.toContain('localStorage')
    expect(codigo).not.toContain('sessionStorage')
    expect(llamadasAlFetchGlobal).toBe(0)
  })
})
