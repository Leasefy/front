/**
 * conversacion.test.ts — el núcleo puro de la conversación con Naira (13-06, Tarea 1).
 *
 * Qué prueba: cada resultado del POST se vuelve un estado de la vista (403/404, que se llevan el hilo entero) o de un
 * turno, con un mapa exhaustivo; un reintento vuelve a consultar EN SU LUGAR; con refs que pueden traer una causa sin
 * clase el texto no se muestra (U6); las oraciones (E13-4) van en tramos por sección, una cifra viva sin corte no se
 * pinta y una hipótesis llega sin banda; la copia propia de cada negativa, las claves de ejes, fallas y carriles y las
 * sugerencias, sin números. Fixtures del año 2000 que pasan el esquema ESTRICTO (FG13-3). Marcador [N13:*] en el TÍTULO.
 */

import { describe, expect, it } from 'vitest'

import { KINDS_DE_ESTADO_NAIRA, type EstadoNaira } from '@/lib/api/naira/cliente'
import {
  CARRILES_NO_SERVIDOS,
  DIMENSIONS,
  ENDPOINTS_DE_NAIRA,
  ESQUEMAS_ESTRICTOS_DE_NAIRA,
  NairaConversationQuestionRequestSchema,
  RAZONES_DE_FALLA,
  RAZONES_DE_NEGATIVA,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  RESPUESTA_TOLERANTE_POR_ENDPOINT,
  type NairaConversationAnswer,
  type NairaConversationSentence,
} from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import en from '@/lib/i18n/locales/en.json'
import es from '@/lib/i18n/locales/es.json'
import { nombreConversacional } from '@/lib/naira/vocabulario-de-seguimiento'

import {
  CLAVE_DE_LA_FALLA,
  CLAVE_DEL_CARRIL_NO_SERVIDO,
  CLAVE_DEL_EJE,
  CONVERSACION_VACIA,
  COPIA_PROPIA_DE_LA_NEGATIVA,
  KINDS_DEL_TURNO,
  LARGO_MAXIMO_DE_PREGUNTA,
  METRICAS_DE_EJEMPLO,
  UMBRAL_DEL_CONTADOR,
  causalesDeLaConversacion,
  conDesenlace,
  conTurnoConsultando,
  desenlaceDelEnvio,
  oracionConCorte,
  preguntaLista,
  preguntaSugerida,
  sugerenciasDeLaNegativa,
  sugerenciasIniciales,
  textoVisibleDeLaRespuesta,
  tramosDeLaRespuesta,
  type DesenlaceDelEnvio,
  type EstadoDeLaConversacion,
  type NairaConversacionNegada,
  type NairaConversacionRespondida,
} from './conversacion'

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['conversacion.preguntar']
const TOLERANTE = RESPUESTA_TOLERANTE_POR_ENDPOINT['conversacion.preguntar']
const ORACION_ESTRICTA = ESQUEMAS_ESTRICTOS_DE_NAIRA.NairaConversationSentence

/** La hoja `k` de un diccionario, o `undefined`. */
const texto = (d: unknown, k: string): unknown =>
  k.split('.').reduce<unknown>((a, p) => (a !== null && typeof a === 'object' && Object.hasOwn(a, p) ? (a as Record<string, unknown>)[p] : undefined), d)

function respondidaDelEjemplo(): NairaConversacionRespondida {
  const e = EJEMPLOS_DE_NAIRA['conversacion.preguntar']
  if (e.kind !== 'respondida') throw new Error('el ejemplo de conversacion.preguntar (13-01) dejó de ser una respondida: ' + e.kind)
  return e
}

/** Una respondida ya validada por el estricto y SIN la enmienda E13-4 (un agente viejo): la acepta solo el tolerante. */
function sinEnmienda(r: NairaConversacionRespondida): NairaConversacionRespondida {
  const validada = ESTRICTO.parse(r)
  if (validada.kind !== 'respondida') throw new Error('sinEnmienda espera una respondida')
  const copia: NairaConversacionRespondida = { ...validada }
  delete copia.oraciones
  delete copia.refs
  return copia
}

const BASE = respondidaDelEjemplo()
const ID = BASE.preguntaId

const RESPONDIDA: NairaConversacionRespondida = {
  ...BASE,
  texto: 'TOKEN-TEXTO (ejemplo)',
  refsServidas: [],
  refs: [],
  oraciones: [{ seccion: 'declaracion', texto: 'TOKEN-TEXTO (ejemplo)', claimClass: null, cifras: [] }],
}
const CON_REFS: NairaConversacionRespondida = {
  ...RESPONDIDA,
  refsServidas: ['INV-0001 (ejemplo)'],
  refs: [{ kind: 'investigacion', id: 'INV-0001 (ejemplo)' }],
}
const SOLO_CHUNKS: NairaConversacionRespondida = {
  ...RESPONDIDA,
  refsServidas: ['chunk-0001 (ejemplo)'],
  refs: [{ kind: 'chunk', source: 'politica (ejemplo)', sourceRef: 'chunk-0001 (ejemplo)' }],
}

const ORACIONES_EN_TRAMOS: NairaConversationSentence[] = [
  { seccion: 'LIVE_DATA', texto: 'a (ejemplo)', claimClass: null, cifras: [{ metricId: 'cartera.morosidad_rate', asOf: '2000-01-03T11:00:00.000Z' }] },
  { seccion: 'LIVE_DATA', texto: 'b (ejemplo)', claimClass: null, cifras: [{ metricId: 'cartera.morosidad_rate', asOf: '2000-01-03T11:00:00.000Z' }] },
  { seccion: 'INFERENCE', texto: 'c (ejemplo)', claimClass: 'asociacion', cifras: [] },
  { seccion: 'declaracion', texto: 'd (ejemplo)', claimClass: null, cifras: [] },
  { seccion: 'LIVE_DATA', texto: 'e (ejemplo)', claimClass: null, cifras: [{ metricId: 'cartera.morosidad_rate', asOf: '2000-01-03T11:00:00.000Z' }] },
]
const CON_ORACIONES: NairaConversacionRespondida = {
  ...RESPONDIDA,
  oraciones: ORACIONES_EN_TRAMOS,
  texto: ORACIONES_EN_TRAMOS.map((o) => o.texto).join('\n'),
}

const NEGADA: NairaConversacionNegada = {
  kind: 'negada',
  preguntaId: ID,
  razon: 'accion_en_fase_12',
  puedoResponder: [
    { kind: 'metrica', metricId: 'cartera.morosidad_rate', nombre: 'índice de morosidad' },
    { kind: 'politicas' },
    { kind: 'ficha_por_direccion_o_referencia' },
  ],
  texto: 'Eso es una acción y no la hago desde aquí (ejemplo).',
}
const BLOQUEADA: NairaConversationAnswer = { kind: 'bloqueada', preguntaId: ID, motivo: 'numeric_drift', texto: 'TOKEN-BLOQUEO (ejemplo)' }
const FALLIDA: NairaConversationAnswer = { kind: 'fallida', preguntaId: ID, razon: 'lectura_fallida', texto: 'TOKEN-FALLA (ejemplo)' }

const FIXTURES: readonly NairaConversationAnswer[] = [BASE, RESPONDIDA, CON_REFS, SOLO_CHUNKS, CON_ORACIONES, NEGADA, BLOQUEADA, FALLIDA]

const ORACION_LIVE = (asOfs: readonly string[]): NairaConversationSentence => ({
  seccion: 'LIVE_DATA',
  texto: 'La morosidad es de un valor de ejemplo (ejemplo).',
  claimClass: null,
  cifras: asOfs.map((asOf) => ({ metricId: 'cartera.morosidad_rate', asOf })),
})
const ORACIONES_SUELTAS: readonly NairaConversationSentence[] = [
  ORACION_LIVE(['2000-01-03T11:00:00.000Z']),
  ORACION_LIVE([]),
  ORACION_LIVE(['2000-01-03T11:00:00.000Z', '2000-02-30T11:00:00.000Z']),
  { seccion: 'KNOWLEDGE', texto: 'Política (ejemplo).', claimClass: null, cifras: [] },
  { seccion: 'INFERENCE', texto: 'Causa (ejemplo).', claimClass: 'asociacion', cifras: [] },
  { seccion: 'declaracion', texto: 'Declaración (ejemplo).', claimClass: null, cifras: [] },
  { seccion: 'INFERENCE', texto: 'H (ejemplo)', claimClass: 'hipotesis', cifras: [] },
  { seccion: 'INFERENCE', texto: 'A (ejemplo)', claimClass: 'asociacion', cifras: [] },
]

function estadoDeEnvio(kind: (typeof KINDS_DE_ESTADO_NAIRA)[number]): EstadoNaira<NairaConversationAnswer> {
  switch (kind) {
    case 'ok':
      return { kind: 'ok', data: RESPONDIDA, origen: 'ejemplo' }
    case 'conflicto':
    case 'rechazado':
      return { kind, razon: null }
    default:
      return { kind }
  }
}

/** Qué deja cada kind del cliente (P3). Un kind nuevo del cliente sin fila acá pone rojo el test. */
const DESENLACE_ESPERADO: Readonly<Record<string, DesenlaceDelEnvio>> = {
  ok: { alcance: 'turno', estado: { kind: 'con_respuesta', respuesta: RESPONDIDA, origen: 'ejemplo' } },
  sin_permiso: { alcance: 'vista', kind: 'sin_permiso' },
  apagada: { alcance: 'vista', kind: 'apagada' },
  no_encontrado: { alcance: 'vista', kind: 'apagada' },
  conflicto: { alcance: 'turno', estado: { kind: 'no_enviada' } },
  no_disponible: { alcance: 'turno', estado: { kind: 'no_enviada' } },
  rechazado: { alcance: 'turno', estado: { kind: 'invalida' } },
  contrato_roto: { alcance: 'turno', estado: { kind: 'ilegible' } },
}

/** Dos turnos: el primero respondido, el segundo consultando. */
function abiertaConDosTurnos(): EstadoDeLaConversacion {
  let e = conTurnoConsultando(CONVERSACION_VACIA, 1, 'PREGUNTA-TOKEN-1 (ejemplo)')
  e = conDesenlace(e, 1, { alcance: 'turno', estado: { kind: 'con_respuesta', respuesta: RESPONDIDA, origen: 'agente' } })
  return conTurnoConsultando(e, 2, 'PREGUNTA-TOKEN-2 (ejemplo)')
}

describe('conversación con Naira (núcleo puro)', () => {
  it('[N13:fixture-es-contrato] cada fixture pasa el esquema estricto; sin la enmienda solo pasa el tolerante', () => {
    for (const f of FIXTURES) {
      const r = ESTRICTO.safeParse(f)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
    for (const o of ORACIONES_SUELTAS) {
      const r = ORACION_ESTRICTA.safeParse(o)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
    for (const r of [sinEnmienda(RESPONDIDA), sinEnmienda(SOLO_CHUNKS)]) {
      expect(TOLERANTE.safeParse(r).success).toBe(true)
      expect(ESTRICTO.safeParse(r).success).toBe(false)
    }
    const todo = JSON.stringify(FIXTURES)
    for (const id of USER_IDS_DE_EJEMPLO) expect(todo).not.toContain(id)
  })

  it('[N13:control-positivo] la pregunta se recorta, el texto sin refs se ve y un ok es una respuesta del turno', () => {
    expect(preguntaLista('  ¿Cómo va la vacancia? (ejemplo)  ')).toBe('¿Cómo va la vacancia? (ejemplo)')
    expect(textoVisibleDeLaRespuesta(RESPONDIDA)).toBe('TOKEN-TEXTO (ejemplo)')
    expect(desenlaceDelEnvio({ kind: 'ok', data: RESPONDIDA, origen: 'agente' })).toEqual({
      alcance: 'turno',
      estado: { kind: 'con_respuesta', respuesta: RESPONDIDA, origen: 'agente' },
    })
  })

  it('[N13:endpoint-de-la-conversacion] la fila del endpoint es POST /conversation/questions con conversation-ask y 404 apagada', () => {
    const fila = ENDPOINTS_DE_NAIRA['conversacion.preguntar']
    expect(fila.metodo).toBe('POST')
    expect(fila.ruta).toBe('/conversation/questions')
    expect([...fila.acciones]).toEqual(['conversation-ask'])
    expect(fila.si404).toBe('apagada')
  })

  it('[N13:largo-del-contrato] el largo máximo es el del contrato y la pregunta vacía o larga no sale', () => {
    expect(LARGO_MAXIMO_DE_PREGUNTA).toBe(2000)
    expect(UMBRAL_DEL_CONTADOR).toBeLessThan(LARGO_MAXIMO_DE_PREGUNTA)
    expect(NairaConversationQuestionRequestSchema.safeParse({ question: 'x'.repeat(LARGO_MAXIMO_DE_PREGUNTA) }).success).toBe(true)
    expect(NairaConversationQuestionRequestSchema.safeParse({ question: 'x'.repeat(LARGO_MAXIMO_DE_PREGUNTA + 1) }).success).toBe(false)
    expect(NairaConversationQuestionRequestSchema.safeParse({ question: '' }).success).toBe(false)
    expect(preguntaLista('')).toBeNull()
    expect(preguntaLista('   \n  ')).toBeNull()
    expect(preguntaLista('x'.repeat(2001))).toBeNull()
    expect(preguntaLista(' a ')).toBe('a')
  })

  it('[N13:desenlace-exhaustivo] cada kind del cliente deja su desenlace: 403/404 la vista, el resto el turno', () => {
    for (const kind of KINDS_DE_ESTADO_NAIRA) {
      const esperado = DESENLACE_ESPERADO[kind]
      expect(esperado, 'kind del cliente sin desenlace esperado: ' + kind).toBeDefined()
      expect(desenlaceDelEnvio(estadoDeEnvio(kind)), kind).toEqual(esperado)
    }
    expect(Object.keys(DESENLACE_ESPERADO).sort()).toEqual([...KINDS_DE_ESTADO_NAIRA].sort())
    expect([...KINDS_DEL_TURNO]).toEqual(['consultando', 'con_respuesta', 'no_enviada', 'ilegible', 'invalida'])
  })

  it('[N13:403-sin-datos] un 403 o un 404 dejan la conversación sin un solo turno', () => {
    const abierta = abiertaConDosTurnos()
    expect(abierta.kind === 'abierta' ? abierta.turnos.length : 0).toBe(2)
    for (const kind of ['sin_permiso', 'apagada'] as const) {
      const despues = conDesenlace(abierta, 2, { alcance: 'vista', kind })
      expect(despues).toEqual({ kind })
      expect(Object.keys(despues)).toEqual(['kind'])
      const json = JSON.stringify(despues)
      for (const token of ['TOKEN-1', 'TOKEN-2', 'TOKEN-TEXTO']) expect(json).not.toContain(token)
    }
    expect(conTurnoConsultando({ kind: 'sin_permiso' }, 9, 'x')).toEqual({ kind: 'sin_permiso' })
  })

  it('[N13:turnos-en-su-lugar] el reintento consulta en su lugar, un id ausente no cambia nada y el ejemplo es pegajoso', () => {
    const uno = conTurnoConsultando(CONVERSACION_VACIA, 1, 'P1')
    expect(uno).toEqual({ kind: 'abierta', turnos: [{ id: 1, pregunta: 'P1', estado: { kind: 'consultando' } }], origen: 'agente' })
    const noEnviada = conDesenlace(uno, 1, { alcance: 'turno', estado: { kind: 'no_enviada' } })
    const dos = conTurnoConsultando(noEnviada, 2, 'P2')
    const reintento = conTurnoConsultando(dos, 1, 'otra cosa')
    if (reintento.kind !== 'abierta') throw new Error('debía seguir abierta')
    expect(reintento.turnos).toHaveLength(2)
    expect(reintento.turnos[0]).toEqual({ id: 1, pregunta: 'P1', estado: { kind: 'consultando' } })
    expect(reintento.turnos[1]?.id).toBe(2)
    expect(conDesenlace(reintento, 99, { alcance: 'turno', estado: { kind: 'ilegible' } })).toBe(reintento)
    const deEjemplo = conDesenlace(reintento, 1, { alcance: 'turno', estado: { kind: 'con_respuesta', respuesta: RESPONDIDA, origen: 'ejemplo' } })
    expect(deEjemplo.kind === 'abierta' ? deEjemplo.origen : null).toBe('ejemplo')
    const luegoAgente = conDesenlace(deEjemplo, 2, { alcance: 'turno', estado: { kind: 'con_respuesta', respuesta: RESPONDIDA, origen: 'agente' } })
    expect(luegoAgente.kind === 'abierta' ? luegoAgente.origen : null).toBe('ejemplo')
  })

  it('[N13:causa-no-clasificada-oculta] con una investigación (o refs sin tipo) el texto no se muestra; un chunk no trae causa', () => {
    expect(textoVisibleDeLaRespuesta(CON_REFS)).toBeNull()
    expect(textoVisibleDeLaRespuesta(SOLO_CHUNKS)).toBe(SOLO_CHUNKS.texto)
    expect(textoVisibleDeLaRespuesta(sinEnmienda(SOLO_CHUNKS))).toBeNull()
    expect(textoVisibleDeLaRespuesta(RESPONDIDA)).toBe(RESPONDIDA.texto)
  })

  it('[N13:oraciones-en-tramos] las oraciones consecutivas de la misma sección van en un tramo, en el orden del servidor', () => {
    const tramos = tramosDeLaRespuesta(CON_ORACIONES)
    expect(tramos).not.toBeNull()
    expect(tramos!.map((t) => t.seccion)).toEqual(['LIVE_DATA', 'INFERENCE', 'declaracion', 'LIVE_DATA'])
    expect(tramos!.map((t) => t.oraciones.length)).toEqual([2, 1, 1, 1])
    expect(tramos!.flatMap((t) => t.oraciones.map((o) => o.texto))).toEqual(['a (ejemplo)', 'b (ejemplo)', 'c (ejemplo)', 'd (ejemplo)', 'e (ejemplo)'])
    expect(tramosDeLaRespuesta(sinEnmienda(RESPONDIDA))).toBeNull()
    expect(tramosDeLaRespuesta({ ...RESPONDIDA, oraciones: [] })).toBeNull()
  })

  it('[N13:cifra-con-su-corte] una oración de dato vivo se pinta solo con cifras y cortes válidos', () => {
    expect(oracionConCorte(ORACION_LIVE(['2000-01-03T11:00:00.000Z']))).toBe(true)
    expect(oracionConCorte(ORACION_LIVE([]))).toBe(false)
    expect(oracionConCorte(ORACION_LIVE(['2000-01-03T11:00:00.000Z', '2000-02-30T11:00:00.000Z']))).toBe(false)
    for (const seccion of ['KNOWLEDGE', 'INFERENCE', 'declaracion'] as const) {
      expect(oracionConCorte({ seccion, texto: 'x (ejemplo)', claimClass: null, cifras: [] }), seccion).toBe(true)
    }
  })

  it('[N13:hipotesis-sin-banda] las causales pasan su clase tal cual y sin banda', () => {
    expect(
      causalesDeLaConversacion([
        { seccion: 'INFERENCE', texto: 'H (ejemplo)', claimClass: 'hipotesis', cifras: [] },
        { seccion: 'INFERENCE', texto: 'A (ejemplo)', claimClass: 'asociacion', cifras: [] },
      ]),
    ).toEqual([
      { texto: 'H (ejemplo)', claimClass: 'hipotesis', hipotesis: null },
      { texto: 'A (ejemplo)', claimClass: 'asociacion', hipotesis: null },
    ])
  })

  it('[N13:negativa-exhaustiva] cada razón de negativa tiene su copia propia; la acción lleva a Aprobaciones', () => {
    expect(Object.keys(COPIA_PROPIA_DE_LA_NEGATIVA).sort()).toEqual([...RAZONES_DE_NEGATIVA].sort())
    for (const r of RAZONES_DE_NEGATIVA) expect(Object.hasOwn(COPIA_PROPIA_DE_LA_NEGATIVA, r), r).toBe(true)
    expect(COPIA_PROPIA_DE_LA_NEGATIVA.accion_en_fase_12).toEqual({ kind: 'aprobaciones', clave: 'inmobiliaria.ai.naira.preguntar.negativa.accion' })
    expect(COPIA_PROPIA_DE_LA_NEGATIVA.fuente_rancia.kind).toBe('precaucion')
    expect(COPIA_PROPIA_DE_LA_NEGATIVA.presupuesto_agotado.kind).toBe('frase')
    expect(COPIA_PROPIA_DE_LA_NEGATIVA.bajo_k).toEqual({ kind: 'ninguna' })
    expect(COPIA_PROPIA_DE_LA_NEGATIVA.dimension_de_persona).toEqual({ kind: 'ninguna' })
    for (const copia of Object.values(COPIA_PROPIA_DE_LA_NEGATIVA)) {
      if (copia.kind === 'ninguna') continue
      const enEs = texto(es, copia.clave)
      const enEn = texto(en, copia.clave)
      expect(typeof enEs === 'string' && enEs.trim() !== '', copia.clave).toBe(true)
      expect(typeof enEn === 'string' && enEn.trim() !== '', copia.clave).toBe(true)
      expect(String(enEs), copia.clave).not.toMatch(/\d/)
    }
  })

  it('[N13:vocabulario-exhaustivo] ejes, fallas y carriles cubren el contrato y resuelven en es y en', () => {
    const mapas: [Readonly<Record<string, string>>, readonly string[]][] = [
      [CLAVE_DEL_EJE, DIMENSIONS],
      [CLAVE_DE_LA_FALLA, RAZONES_DE_FALLA],
      [CLAVE_DEL_CARRIL_NO_SERVIDO, CARRILES_NO_SERVIDOS],
    ]
    for (const [mapa, vocabulario] of mapas) {
      expect(Object.keys(mapa).sort()).toEqual([...vocabulario].sort())
      const textosEs = new Set<string>()
      for (const clave of Object.values(mapa)) {
        const enEs = texto(es, clave)
        const enEn = texto(en, clave)
        expect(typeof enEs === 'string' && enEs.trim() !== '', clave).toBe(true)
        expect(typeof enEn === 'string' && enEn.trim() !== '', clave).toBe(true)
        textosEs.add(String(enEs))
      }
      expect(textosEs.size).toBe(Object.keys(mapa).length)
    }
    for (const d of [es, en]) {
      expect(String(texto(d, 'inmobiliaria.ai.naira.preguntar.alcancePorEje'))).toContain('{{eje}}')
      expect(String(texto(d, 'inmobiliaria.ai.naira.preguntar.quedan'))).toContain('{{n}}')
    }
  })

  it('[N13:sugerencias-sin-numeros] lo que puede responder se sugiere en orden, sin números, y el vacío por visibilidad', () => {
    expect(preguntaSugerida('índice de morosidad')).toBe('Índice de morosidad: ¿cómo va?')
    const sugerencias = sugerenciasDeLaNegativa(NEGADA)
    expect(sugerencias).toEqual([
      { kind: 'metrica', etiqueta: 'índice de morosidad', pregunta: 'Índice de morosidad: ¿cómo va?' },
      { kind: 'texto', clave: 'inmobiliaria.ai.naira.preguntar.sugerencias.politicas' },
      { kind: 'texto', clave: 'inmobiliaria.ai.naira.preguntar.sugerencias.ficha' },
    ])
    const sinNombre: NairaConversacionNegada = {
      ...NEGADA,
      puedoResponder: [{ kind: 'metrica', metricId: 'cartera.morosidad_rate', nombre: '  ' }],
    }
    expect(sugerenciasDeLaNegativa(sinNombre)).toEqual([])
    const todas = sugerenciasIniciales(() => true)
    expect(todas).toHaveLength(METRICAS_DE_EJEMPLO.length)
    expect(todas).toHaveLength(3)
    todas.forEach((s, i) => {
      expect(s.kind).toBe('metrica')
      if (s.kind === 'metrica') expect(s.etiqueta).toBe(nombreConversacional(METRICAS_DE_EJEMPLO[i]!))
    })
    const soloCartera = sugerenciasIniciales((m) => m === 'cartera.morosidad_rate')
    expect(soloCartera).toEqual([{ kind: 'metrica', etiqueta: 'índice de morosidad', pregunta: 'Índice de morosidad: ¿cómo va?' }])
    for (const s of [...sugerencias, ...todas, ...soloCartera]) {
      if (s.kind !== 'metrica') continue
      expect(s.etiqueta).not.toMatch(/[\d%]/)
      expect(s.pregunta).not.toMatch(/[\d%]/)
    }
  })
})
