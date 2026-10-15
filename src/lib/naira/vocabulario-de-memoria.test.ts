import { describe, expect, it } from 'vitest'
import { KINDS_DE_ESTADO_NAIRA, RAZON_PEDIDO_INVALIDO, type EstadoNaira } from '@/lib/api/naira/cliente'
import {
  ERASURE_REASONS,
  PERSISTED_MEMORY_LAYERS,
  PROVENANCE_KINDS,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaMemoryItem,
} from '@/lib/api/naira/contrato'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'
import {
  AVISOS_DE_MEMORIA,
  CLAVE_DE_LA_CAPA,
  CLAVE_DE_LA_PROCEDENCIA,
  CLAVE_DEL_AUTOR,
  CLAVE_DEL_AVISO,
  CLAVE_DEL_MOTIVO_DE_BORRADO,
  CLAVE_DEL_RECHAZO_DE_CONTENIDO,
  CLAVE_DEL_RECHAZO_OTRO,
  MOTIVOS_DE_RECHAZO_DE_CONTENIDO,
  OPERACIONES_DE_MEMORIA,
  SIN_FILTROS,
  autorDelItem,
  claveDelHecho,
  claveDelRechazoDeContenido,
  desenlaceDeEscritura,
  esPromovible,
  filtrarLaMemoria,
  hayFiltros,
  idDelArticuloDeMemoria,
  leerFiltrosDeMemoria,
  siguienteFocoTrasBorrar,
  type DesenlaceDeEscritura,
  type OperacionDeMemoria,
} from './vocabulario-de-memoria'

const texto = (d: unknown, k: string): unknown =>
  k.split('.').reduce<unknown>((a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), d)

type Capa = NairaMemoryItem['layer']
type Procedencia = NairaMemoryItem['provenance']

function item(o: { id: string; layer: Capa; provenance: Procedencia; content?: NairaMemoryItem['content'] }): NairaMemoryItem {
  return {
    id: o.id,
    layer: o.layer,
    provenance: o.provenance,
    trust: 'system',
    writtenBy: { kind: 'system' },
    derivedFrom: { kind: 'human_statement' },
    recordedAt: '2000-01-03T12:00:00.000Z',
    revision: '7',
    content: o.content ?? { kind: 'present', text: 'Texto de la memoria ' + o.id },
  }
}

const vista = (items: readonly NairaMemoryItem[]) => ({
  snapshot: { revision: '9' },
  items,
  pendingProposals: [],
  generatedAt: '2000-01-03T12:00:00.000Z',
})

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista']

const INFERIDA = item({ id: 'I', layer: 'semantic', provenance: 'inferred' })

describe('vocabulario de la memoria de Naira', () => {
  it('[N13:fixture-es-contrato] los ítems de la fábrica pasan el esquema ESTRICTO de memoria.vista; un campo mal escrito no', () => {
    const todos = PERSISTED_MEMORY_LAYERS.flatMap((layer) => PROVENANCE_KINDS.map((provenance) => item({ id: layer + provenance, layer, provenance })))
    expect(() => ESTRICTO.parse(vista(todos))).not.toThrow()
    const roto = { ...INFERIDA, provenancee: INFERIDA.provenance } as Record<string, unknown>
    delete roto.provenance
    expect(() => ESTRICTO.parse(vista([roto as unknown as NairaMemoryItem]))).toThrow()
  })

  it('[N13:control-positivo] autor, promovible, procedencia y rechazo dan su valor', () => {
    expect(autorDelItem({ kind: 'system' })).toBe('naira')
    expect(esPromovible(INFERIDA)).toBe(true)
    expect(texto(es, CLAVE_DE_LA_PROCEDENCIA.stated_by_human)).toBe('Lo dijo alguien del equipo')
    expect(texto(es, claveDelRechazoDeContenido('pii:cedula'))).toBe('Tiene un número de cédula.')
  })

  it('[N13:vocabulario-exhaustivo] cada mapa tiene exactamente las claves de su vocabulario y resuelve en es y en', () => {
    const casos: ReadonlyArray<readonly [Record<string, string>, readonly string[]]> = [
      [CLAVE_DE_LA_CAPA, PERSISTED_MEMORY_LAYERS],
      [CLAVE_DE_LA_PROCEDENCIA, PROVENANCE_KINDS],
      [CLAVE_DEL_MOTIVO_DE_BORRADO, ERASURE_REASONS],
      [CLAVE_DEL_RECHAZO_DE_CONTENIDO, MOTIVOS_DE_RECHAZO_DE_CONTENIDO],
      [CLAVE_DEL_AVISO, AVISOS_DE_MEMORIA],
      [CLAVE_DEL_AUTOR, ['naira', 'equipo']],
    ]
    for (const [mapa, vocabulario] of casos) {
      expect(Object.keys(mapa).sort()).toEqual([...vocabulario].sort())
      const vistos = new Set<string>()
      for (const clave of Object.values(mapa)) {
        for (const d of [es, en]) {
          const v = texto(d, clave)
          expect(typeof v === 'string' && v.trim() !== '', clave).toBe(true)
        }
        const enEs = texto(es, clave) as string
        expect(vistos.has(enEs), enEs).toBe(false)
        vistos.add(enEs)
      }
    }
    for (const d of [es, en]) {
      expect(typeof texto(d, CLAVE_DEL_RECHAZO_OTRO)).toBe('string')
      expect(texto(d, 'inmobiliaria.ai.naira.memoria.version')).toContain('{{revision}}')
      for (const k of ['item.desde', 'item.borrado', 'propuestas.propuestoEl']) {
        expect(texto(d, 'inmobiliaria.ai.naira.memoria.' + k)).toContain('{{fecha}}')
      }
    }
  })

  it('[N13:rechazo-de-contenido] las cuatro razones de la pantalla y nada más; lo demás da la clave genérica', () => {
    expect(MOTIVOS_DE_RECHAZO_DE_CONTENIDO).toEqual(['pii:cedula', 'pii:telefono', 'pii:email', 'pending_counsel:naira_desempeno_empleados'])
    expect(claveDelRechazoDeContenido('pii:cedula')).toBe('inmobiliaria.ai.naira.memoria.rechazos.cedula')
    expect(claveDelRechazoDeContenido('pii:telefono')).toBe('inmobiliaria.ai.naira.memoria.rechazos.telefono')
    expect(claveDelRechazoDeContenido('pii:email')).toBe('inmobiliaria.ai.naira.memoria.rechazos.correo')
    expect(claveDelRechazoDeContenido('pending_counsel:naira_desempeno_empleados')).toBe('inmobiliaria.ai.naira.memoria.rechazos.desempeno')
    for (const r of [null, '', 'pii:otra', 'constructor', '__proto__', 'toString', 'PII:CEDULA']) {
      expect(claveDelRechazoDeContenido(r)).toBe(CLAVE_DEL_RECHAZO_OTRO)
    }
  })

  it('[N13:rechazo-sin-eco] ningún desenlace lleva la razón cruda del servidor', () => {
    expect(claveDelRechazoDeContenido('pii:cedula 1234567890')).toBe(CLAVE_DEL_RECHAZO_OTRO)
    for (const op of OPERACIONES_DE_MEMORIA) {
      for (const razon of ['RAZON-CRUDA-7', 'pii:cedula']) {
        for (const kind of ['conflicto', 'rechazado'] as const) {
          const s = JSON.stringify(desenlaceDeEscritura(op, { kind, razon }))
          expect(s, op + ' ' + kind + ' ' + razon).not.toContain(razon)
        }
      }
    }
  })

  it('[N13:autor-sin-persona] el autor es un tipo, nunca la persona', () => {
    const autor = autorDelItem({ kind: 'user', userId: 'USR-B5-1' })
    expect(autor).toBe('equipo')
    expect(JSON.stringify(autor)).not.toContain('USR-B5-1')
    expect(texto(es, CLAVE_DEL_AUTOR.naira)).toBe('Lo escribió Naira')
    expect(texto(es, CLAVE_DEL_AUTOR.equipo)).toBe('Lo escribió alguien del equipo')
  })

  it('[N13:promovible-como-el-agente] solo una inferencia que no es procedimiento y sigue presente', () => {
    for (const layer of ['episodic', 'semantic', 'preference'] as const) {
      expect(esPromovible(item({ id: 'a', layer, provenance: 'inferred' })), layer).toBe(true)
    }
    expect(esPromovible(item({ id: 'b', layer: 'procedural', provenance: 'inferred' }))).toBe(false)
    for (const provenance of ['observed', 'stated_by_human'] as const) {
      for (const layer of PERSISTED_MEMORY_LAYERS) {
        expect(esPromovible(item({ id: 'c', layer, provenance })), provenance + layer).toBe(false)
      }
    }
    const borrada = item({
      id: 'd',
      layer: 'semantic',
      provenance: 'inferred',
      content: { kind: 'erased', erasedAt: '2000-01-03T12:00:00.000Z', erasedBy: { kind: 'system' } },
    })
    expect(esPromovible(borrada)).toBe(false)
  })

  it('[N13:filtros-validados] la URL solo elige valores del vocabulario', () => {
    expect(leerFiltrosDeMemoria('procedural', 'inferred')).toEqual({ capa: 'procedural', procedencia: 'inferred' })
    for (const [c, p] of [[null, null], ['x', 'constructor'], ['__proto__', 'toString'], ['PROCEDURAL', 'Inferred'], ['', '']] as const) {
      expect(leerFiltrosDeMemoria(c, p)).toEqual(SIN_FILTROS)
    }
    expect(hayFiltros(SIN_FILTROS)).toBe(false)
    expect(hayFiltros({ capa: 'semantic', procedencia: 'todas' })).toBe(true)
  })

  it('[N13:filtrar-sin-reordenar] filtra en el orden del servidor', () => {
    const items = [
      item({ id: 'A', layer: 'semantic', provenance: 'inferred' }),
      item({ id: 'B', layer: 'episodic', provenance: 'observed' }),
      item({ id: 'C', layer: 'semantic', provenance: 'observed' }),
      item({
        id: 'D',
        layer: 'semantic',
        provenance: 'inferred',
        content: { kind: 'erased', erasedAt: '2000-01-03T12:00:00.000Z', erasedBy: { kind: 'system' } },
      }),
    ]
    const ids = (f: Parameters<typeof filtrarLaMemoria>[1]) => filtrarLaMemoria(items, f).map((i) => i.id)
    expect(ids({ capa: 'semantic', procedencia: 'todas' })).toEqual(['A', 'C', 'D'])
    expect(ids({ capa: 'todas', procedencia: 'inferred' })).toEqual(['A', 'D'])
    expect(ids({ capa: 'semantic', procedencia: 'inferred' })).toEqual(['A', 'D'])
    expect(ids(SIN_FILTROS)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('[N13:desenlace-por-operacion] la tabla entera, recorriendo cada kind del cliente', () => {
    const TEL = 'inmobiliaria.ai.naira.memoria.rechazos.telefono'
    const esperado = (op: OperacionDeMemoria, e: EstadoNaira<unknown>): DesenlaceDeEscritura => {
      const resolver = op === 'resolver'
      switch (e.kind) {
        case 'ok':
          return { kind: 'hecho' }
        case 'sin_permiso':
          return { kind: 'sin_permiso' }
        case 'conflicto':
          return { kind: 'recargar', aviso: resolver ? 'propuesta_ya_resuelta' : 'item_cambio' }
        case 'no_encontrado':
        case 'apagada':
          return { kind: 'recargar', aviso: resolver ? 'propuesta_ya_no_esta' : 'item_ya_no_esta' }
        case 'rechazado':
          if (op === 'promover' && e.razon === 'no-promovible') return { kind: 'recargar', aviso: 'ya_no_se_puede_confirmar' }
          if (op === 'borrar') return { kind: 'reintentable' }
          if (e.razon === 'pii:telefono') return { kind: 'rechazo_de_contenido', clave: TEL }
          if (op === 'corregir') return { kind: 'rechazo_de_contenido', clave: CLAVE_DEL_RECHAZO_OTRO }
          return { kind: 'reintentable' }
        case 'no_disponible':
          return { kind: 'reintentable' }
        case 'contrato_roto':
          return { kind: 'recargar', aviso: 'sin_confirmar' }
      }
    }
    const RAZONES = ['already_resolved', 'not-current', 'ya-redactado', 'no-promovible', 'pii:telefono', 'solicitud-invalida', RAZON_PEDIDO_INVALIDO, null]
    const estados = (kind: (typeof KINDS_DE_ESTADO_NAIRA)[number]): EstadoNaira<unknown>[] => {
      switch (kind) {
        case 'ok':
          return [{ kind: 'ok', data: {}, origen: 'agente' }]
        case 'conflicto':
        case 'rechazado':
          return RAZONES.map((razon) => ({ kind, razon }))
        default:
          return [{ kind } as EstadoNaira<unknown>]
      }
    }
    let n = 0
    for (const op of OPERACIONES_DE_MEMORIA) {
      for (const kind of KINDS_DE_ESTADO_NAIRA) {
        for (const e of estados(kind)) {
          expect(desenlaceDeEscritura(op, e), op + ' ' + JSON.stringify(e)).toEqual(esperado(op, e))
          n++
        }
      }
    }
    expect(n).toBeGreaterThan(OPERACIONES_DE_MEMORIA.length * KINDS_DE_ESTADO_NAIRA.length)
    // puntos fijos de la tabla (P2), escritos a mano
    expect(desenlaceDeEscritura('resolver', { kind: 'conflicto', razon: 'already_resolved' })).toEqual({ kind: 'recargar', aviso: 'propuesta_ya_resuelta' })
    expect(desenlaceDeEscritura('corregir', { kind: 'conflicto', razon: 'not-current' })).toEqual({ kind: 'recargar', aviso: 'item_cambio' })
    expect(desenlaceDeEscritura('borrar', { kind: 'rechazado', razon: 'pii:telefono' })).toEqual({ kind: 'reintentable' })
    expect(desenlaceDeEscritura('resolver', { kind: 'rechazado', razon: 'pii:telefono' })).toEqual({ kind: 'rechazo_de_contenido', clave: TEL })
    expect(desenlaceDeEscritura('corregir', { kind: 'rechazado', razon: RAZON_PEDIDO_INVALIDO })).toEqual({ kind: 'rechazo_de_contenido', clave: CLAVE_DEL_RECHAZO_OTRO })
    expect(desenlaceDeEscritura('promover', { kind: 'rechazado', razon: 'x' })).toEqual({ kind: 'reintentable' })
  })

  it('[N13:clave-del-hecho] la copy del toast por operación', () => {
    const casos: ReadonlyArray<readonly [OperacionDeMemoria, 'confirm' | 'reject' | null, string]> = [
      ['corregir', null, 'inmobiliaria.ai.naira.memoria.correccion.corregido'],
      ['borrar', null, 'inmobiliaria.ai.naira.memoria.borrado.hecho'],
      ['promover', null, 'inmobiliaria.ai.naira.memoria.promocion.hecho'],
      ['resolver', 'confirm', 'inmobiliaria.ai.naira.memoria.propuestas.confirmada'],
      ['resolver', 'reject', 'inmobiliaria.ai.naira.memoria.propuestas.rechazada'],
    ]
    for (const [op, decision, clave] of casos) {
      expect(claveDelHecho(op, decision)).toBe(clave)
      for (const d of [es, en]) expect(typeof texto(d, clave)).toBe('string')
    }
  })

  it('[N13:foco-tras-borrar] el siguiente visible o el título', () => {
    expect(siguienteFocoTrasBorrar(['a', 'b', 'c'], 'a')).toBe('b')
    expect(siguienteFocoTrasBorrar(['a', 'b', 'c'], 'b')).toBe('c')
    expect(siguienteFocoTrasBorrar(['a', 'b', 'c'], 'c')).toBeNull()
    expect(siguienteFocoTrasBorrar(['a', 'b', 'c'], 'x')).toBeNull()
    expect(siguienteFocoTrasBorrar([], 'a')).toBeNull()
    expect(idDelArticuloDeMemoria('MEM-1')).toBe('memoria-MEM-1')
  })
})
