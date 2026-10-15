/**
 * conversacion.ts — el núcleo PURO de la conversación ON-DEMAND con Naira (Fase 13, plan 13-06; D13-4, D13-10, D13-13).
 * Sin React, sin red, sin rutas y sin almacenamiento.
 *
 * Qué decide:
 *   · los tipos del hilo (turnos) y de la VISTA de la conversación. Viven acá y no en el hook para que las vistas que
 *     pintan vacíos no importen nada de `@/lib/hooks/` (guardia cuatro-estados);
 *   · cómo un resultado del POST de la pregunta se vuelve un estado de la VISTA —403 y 404, que se llevan el hilo ENTERO:
 *     `sin_permiso` y `apagada` no tienen campo para turnos, así que nada de lo que se vio sobrevive (FG13-1)— o de UN
 *     TURNO (red, 5xx, 409, 400/422 o un 200 ilegible dejan el resto del hilo);
 *   · qué parte de una respuesta se puede mostrar: con `oraciones` (E13-4) cada una va en la categoría de su sección y la
 *     causa pasa por `OracionesCausales`; sin ellas, el texto entero solo si no puede traer una causa sin clase (U6);
 *   · la copia propia de cada negativa, las claves de ejes, fallas y carriles, y qué se sugiere preguntar.
 *
 * Nada de la conversación se guarda (D13-13: el agente tampoco guarda el texto de la pregunta). La pregunta precargada es
 * vocabulario del agente y va en español siempre, también con el panel en inglés (P9). Este archivo no conoce ninguna
 * ruta del panel (D13-1): el enlace a Aprobaciones lo recibe la vista ya armado.
 */

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type {
  CARRILES_NO_SERVIDOS,
  DIMENSIONS,
  NairaConversationAnswer,
  NairaConversationSentence,
  RAZONES_DE_FALLA,
  RAZONES_DE_NEGATIVA,
} from '@/lib/api/naira/contrato'
import type { OracionCausal } from '@/lib/naira/afirmaciones'
import { formatearCorte } from '@/lib/naira/formato'
import { nombreConversacional } from '@/lib/naira/vocabulario-de-seguimiento'

// ── La pregunta ──

// fuente: 07-01-PLAN.md (ROUTER_QUESTION_MAX_CHARS) · paridad con NairaConversationQuestionRequestSchema (13-01)
// estado: PLANIFICADO
export const LARGO_MAXIMO_DE_PREGUNTA = 2000
/** UI-SPEC §7.7: el contador de caracteres aparece desde acá. */
export const UMBRAL_DEL_CONTADOR = 1800

/** La pregunta que se puede enviar: recortada; vacía o más larga que el máximo ⇒ `null`. */
export function preguntaLista(borrador: string): string | null {
  const recortada = borrador.trim()
  if (recortada === '' || recortada.length > LARGO_MAXIMO_DE_PREGUNTA) return null
  return recortada
}

// ── Qué se puede mostrar de una respuesta ──

export type NairaConversacionRespondida = Extract<NairaConversationAnswer, { readonly kind: 'respondida' }>
export type NairaConversacionNegada = Extract<NairaConversationAnswer, { readonly kind: 'negada' }>

/**
 * U6 del bloque neutro (sin `oraciones`): el texto entero se muestra solo si no puede traer una causa sin clase. Medido:
 * la causa citada sale SOLO de una investigación (9.5-04-PLAN.md:409-410), así que con `refs` tipadas (E13-4) solo una
 * `investigacion` puede traerla; sin `refs` (agente sin la enmienda), cualquier ref servida cuenta.
 */
export function textoVisibleDeLaRespuesta(r: NairaConversacionRespondida): string | null {
  const puedeTraerCausa = r.refs !== undefined ? r.refs.some((ref) => ref.kind === 'investigacion') : r.refsServidas.length > 0
  return puedeTraerCausa ? null : r.texto
}

/** Oraciones consecutivas de la MISMA sección (E13-4, D13-9), en el orden del servidor. */
export type TramoDeLaRespuesta = {
  readonly seccion: NairaConversationSentence['seccion']
  readonly oraciones: readonly NairaConversationSentence[]
}

/** Los tramos de una respuesta con `oraciones` (una por línea de `texto`, 9.5-04-PLAN.md:409); sin ellas ⇒ `null`. */
export function tramosDeLaRespuesta(r: NairaConversacionRespondida): readonly TramoDeLaRespuesta[] | null {
  if (r.oraciones === undefined || r.oraciones.length === 0) return null
  const tramos: { seccion: NairaConversationSentence['seccion']; oraciones: NairaConversationSentence[] }[] = []
  for (const oracion of r.oraciones) {
    const ultimo = tramos[tramos.length - 1]
    if (ultimo !== undefined && ultimo.seccion === oracion.seccion) {
      ultimo.oraciones.push(oracion)
    } else {
      tramos.push({ seccion: oracion.seccion, oraciones: [oracion] })
    }
  }
  return tramos
}

/** El reloj solo cambia la edad de un corte, no su validez (13-01): para decidir si un corte vale basta cualquier fecha. */
const EPOCA = new Date(0)

/**
 * INV-07: una oración de dato vivo se pinta solo con al menos una cifra y todos sus cortes válidos. Las demás secciones
 * no llevan cifras propias (una cita INFERENCE trae su corte dentro del texto, 9.5-04-PLAN.md:409).
 */
export function oracionConCorte(o: NairaConversationSentence): boolean {
  return o.seccion !== 'LIVE_DATA' || (o.cifras.length > 0 && o.cifras.every((c) => formatearCorte(c.asOf, EPOCA) !== null))
}

/**
 * Las oraciones causales de la conversación en la forma de `OracionesCausales` (13-02). La `OracionServida` no trae
 * `hipotesis` (9.5-01-PLAN.md:267): una hipótesis de la conversación no tiene banda y `OracionesCausales` la oculta y lo
 * declara (13-02 P11). La clase pasa TAL CUAL.
 */
export function causalesDeLaConversacion(oraciones: readonly NairaConversationSentence[]): readonly OracionCausal[] {
  return oraciones.map((o) => ({ texto: o.texto, claimClass: o.claimClass, hipotesis: null }))
}

// ── El hilo y la vista ──

export const KINDS_DEL_TURNO = ['consultando', 'con_respuesta', 'no_enviada', 'ilegible', 'invalida'] as const

export type EstadoDelTurno =
  | { readonly kind: 'consultando' }
  | { readonly kind: 'con_respuesta'; readonly respuesta: NairaConversationAnswer; readonly origen: 'agente' | 'ejemplo' }
  /** Red, 5xx, 409 o sin la URL del agente ⇒ «Reintentar pregunta» (la MISMA). */
  | { readonly kind: 'no_enviada' }
  /** Un 200 que no parsea (contrato_roto): nada de la respuesta. */
  | { readonly kind: 'ilegible' }
  /** 400/422 o un pedido que el front no pudo armar. */
  | { readonly kind: 'invalida' }

/** Si el contrato del turno gana un kind que KINDS_DEL_TURNO no tiene (o al revés), esto deja de compilar. */
type Afirmar<T extends true> = T
type _KindsDelTurnoCompletos = Afirmar<
  EstadoDelTurno['kind'] extends (typeof KINDS_DEL_TURNO)[number]
    ? (typeof KINDS_DEL_TURNO)[number] extends EstadoDelTurno['kind']
      ? true
      : false
    : false
>

export interface TurnoDeConversacion {
  readonly id: number
  readonly pregunta: string
  readonly estado: EstadoDelTurno
}

export interface HiloDeNaira {
  readonly turnos: readonly TurnoDeConversacion[]
}

/** `sin_permiso` y `apagada` NO tienen campo para turnos: tras un 403 o un 404 nada del hilo sobrevive. */
export type EstadoDeLaConversacion =
  | { readonly kind: 'abierta'; readonly turnos: readonly TurnoDeConversacion[]; readonly origen: 'agente' | 'ejemplo' }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'apagada' }

export const CONVERSACION_VACIA: EstadoDeLaConversacion = { kind: 'abierta', turnos: [], origen: 'agente' }

export type DesenlaceDelEnvio =
  | { readonly alcance: 'vista'; readonly kind: 'sin_permiso' | 'apagada' }
  | { readonly alcance: 'turno'; readonly estado: Exclude<EstadoDelTurno, { readonly kind: 'consultando' }> }

const CONSULTANDO = { kind: 'consultando' } as const
const NO_ENVIADA = { kind: 'no_enviada' } as const
const ILEGIBLE = { kind: 'ilegible' } as const
const INVALIDA = { kind: 'invalida' } as const

/**
 * Qué deja un resultado del POST (P3). `no_encontrado` no lo produce el cliente para este endpoint (`si404: 'apagada'` y
 * sin parámetro de ruta): si llegara, se trata como `apagada`, lo más cerrado.
 */
export function desenlaceDelEnvio(e: EstadoNaira<NairaConversationAnswer>): DesenlaceDelEnvio {
  switch (e.kind) {
    case 'ok':
      return { alcance: 'turno', estado: { kind: 'con_respuesta', respuesta: e.data, origen: e.origen } }
    case 'sin_permiso':
      return { alcance: 'vista', kind: 'sin_permiso' }
    case 'apagada':
    case 'no_encontrado':
      return { alcance: 'vista', kind: 'apagada' }
    case 'conflicto':
    case 'no_disponible':
      return { alcance: 'turno', estado: NO_ENVIADA }
    case 'rechazado': return { alcance: 'turno', estado: INVALIDA }
    case 'contrato_roto':
      return { alcance: 'turno', estado: ILEGIBLE }
    default: {
      const _exhaustivo: never = e
      return _exhaustivo
    }
  }
}

/**
 * Un turno pasa a `consultando`: si el id es nuevo, se agrega al final; si ya existe (un reintento), vuelve a
 * `consultando` EN SU LUGAR con su pregunta. Tras un 403 o un 404 no nace ningún turno.
 */
export function conTurnoConsultando(e: EstadoDeLaConversacion, id: number, pregunta: string): EstadoDeLaConversacion {
  if (e.kind !== 'abierta') return e
  if (!e.turnos.some((t) => t.id === id)) {
    return { kind: 'abierta', turnos: [...e.turnos, { id, pregunta, estado: CONSULTANDO }], origen: e.origen }
  }
  return {
    kind: 'abierta',
    turnos: e.turnos.map((t) => (t.id === id ? { id: t.id, pregunta: t.pregunta, estado: CONSULTANDO } : t)),
    origen: e.origen,
  }
}

/**
 * El desenlace de un envío. De la VISTA (403/404) ⇒ la conversación entera pasa a ese estado, sin turnos. Del TURNO ⇒
 * reemplaza solo el estado de ese turno (un id ausente deja todo igual) y el origen pasa a 'ejemplo' con la primera
 * respuesta de ejemplo y ya no vuelve (P13).
 */
export function conDesenlace(e: EstadoDeLaConversacion, id: number, d: DesenlaceDelEnvio): EstadoDeLaConversacion {
  if (d.alcance === 'vista') return { kind: d.kind }
  if (e.kind !== 'abierta') return e
  if (!e.turnos.some((t) => t.id === id)) return e
  const deEjemplo = d.estado.kind === 'con_respuesta' && d.estado.origen === 'ejemplo'
  return {
    kind: 'abierta',
    turnos: e.turnos.map((t) => (t.id === id ? { id: t.id, pregunta: t.pregunta, estado: d.estado } : t)),
    origen: e.origen === 'ejemplo' || deEjemplo ? 'ejemplo' : 'agente',
  }
}

// ── Claves de los vocabularios cerrados de la respuesta ──

/**
 * El nombre de cada eje del alcance `por_eje`. Copy propia del front (P6): el agente tiene NOMBRES_DE_EJE pero la ruta no
 * los sirve (E13-13). Un eje nuevo del contrato rompe `tsc`.
 */
export const CLAVE_DEL_EJE = {
  stage: 'inmobiliaria.ai.naira.preguntar.ejes.stage',
  guarantee_status: 'inmobiliaria.ai.naira.preguntar.ejes.guarantee_status',
  channel: 'inmobiliaria.ai.naira.preguntar.ejes.channel',
  payment_provider: 'inmobiliaria.ai.naira.preguntar.ejes.payment_provider',
  payment_method: 'inmobiliaria.ai.naira.preguntar.ejes.payment_method',
  discount_kind: 'inmobiliaria.ai.naira.preguntar.ejes.discount_kind',
  stage_at_offer: 'inmobiliaria.ai.naira.preguntar.ejes.stage_at_offer',
  urgency: 'inmobiliaria.ai.naira.preguntar.ejes.urgency',
  dispute_status: 'inmobiliaria.ai.naira.preguntar.ejes.dispute_status',
  city: 'inmobiliaria.ai.naira.preguntar.ejes.city',
  property_type: 'inmobiliaria.ai.naira.preguntar.ejes.property_type',
  stratum: 'inmobiliaria.ai.naira.preguntar.ejes.stratum',
} as const satisfies Record<(typeof DIMENSIONS)[number], string>

/** Qué hacer ante cada falla del motor (bloqueada y fallida no muestran números). */
export const CLAVE_DE_LA_FALLA = {
  registro_no_escrito: 'inmobiliaria.ai.naira.preguntar.falla.registro_no_escrito',
  cupo_no_reservado: 'inmobiliaria.ai.naira.preguntar.falla.cupo_no_reservado',
  lectura_fallida: 'inmobiliaria.ai.naira.preguntar.falla.lectura_fallida',
} as const satisfies Record<(typeof RAZONES_DE_FALLA)[number], string>

/** Lo que la respuesta NO consultó (D9.5-5): se declara debajo del alcance. */
export const CLAVE_DEL_CARRIL_NO_SERVIDO = {
  grafo_sin_filtro_de_rol: 'inmobiliaria.ai.naira.preguntar.noServidos.grafo_sin_filtro_de_rol',
} as const satisfies Record<(typeof CARRILES_NO_SERVIDOS)[number], string>

// ── Negativas ──

/** Lo que la UI agrega al texto del servidor en una negativa (P8). */
export type CopiaPropiaDeLaNegativa =
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'frase'; readonly clave: string }
  | { readonly kind: 'precaucion'; readonly clave: string }
  | { readonly kind: 'aprobaciones'; readonly clave: string }

/**
 * Copia propia SOLO donde UI-SPEC §7.7 la manda. `accion_en_fase_12` (🔔 H11 de la 12): nada se ejecuta ni se propone desde
 * la conversación; las propuestas se aprueban en Aprobaciones. Las demás: el texto del servidor + las sugerencias.
 */
export const COPIA_PROPIA_DE_LA_NEGATIVA = {
  'fuera_de_catalogo': { kind: 'ninguna' },
  'instruccion': { kind: 'ninguna' },
  'accion_en_fase_12': { kind: 'aprobaciones', clave: 'inmobiliaria.ai.naira.preguntar.negativa.accion' },
  // B-5: el servidor reencuadra sin el tamaño de la persona ni del grupo ([DEC:reencuadre] de 9.5-04); la UI no agrega nada.
  'dimension_de_persona': { kind: 'ninguna' },
  'eje_no_disponible': { kind: 'ninguna' },
  // B-5: ídem; el contrato no trae ningún tamaño de grupo que la UI pudiera mostrar.
  'bajo_k': { kind: 'ninguna' },
  'metrica_no_visible_para_el_rol': { kind: 'ninguna' },
  'documento_no_buscable_en_v1': { kind: 'ninguna' },
  'fuente_rancia': { kind: 'precaucion', clave: 'inmobiliaria.ai.naira.preguntar.negativa.fuenteRancia' },
  'presupuesto_agotado': { kind: 'frase', clave: 'inmobiliaria.ai.naira.preguntar.negativa.presupuesto' },
} as const satisfies Record<(typeof RAZONES_DE_NEGATIVA)[number], CopiaPropiaDeLaNegativa>

// ── Sugerencias ──

export type SugerenciaDePregunta =
  | { readonly kind: 'metrica'; readonly etiqueta: string; readonly pregunta: string }
  | { readonly kind: 'texto'; readonly clave: string }

/**
 * La pregunta que precarga una sugerencia de métrica (P9): el nombre con mayúscula inicial + «: ¿cómo va?». Los nombres
 * conversacionales del agente no traen artículo («¿Cómo va índice de morosidad?» sería agramatical); el nombre entero es
 * lo que el agente enruta a su métrica.
 */
export function preguntaSugerida(nombre: string): string {
  const limpio = nombre.trim()
  if (limpio === '') return ''
  return limpio.charAt(0).toLocaleUpperCase('es-CO') + limpio.slice(1) + ': ¿cómo va?'
}

/** Lo que Naira sí puede responder, en el orden del servidor; una métrica sin nombre se omite. */
export function sugerenciasDeLaNegativa(r: NairaConversacionNegada): readonly SugerenciaDePregunta[] {
  const salida: SugerenciaDePregunta[] = []
  for (const puede of r.puedoResponder) {
    switch (puede.kind) {
      case 'metrica':
        if (puede.nombre.trim() !== '') salida.push({ kind: 'metrica', etiqueta: puede.nombre, pregunta: preguntaSugerida(puede.nombre) })
        break
      case 'politicas':
        salida.push({ kind: 'texto', clave: 'inmobiliaria.ai.naira.preguntar.sugerencias.politicas' })
        break
      case 'ficha_por_direccion_o_referencia':
        salida.push({ kind: 'texto', clave: 'inmobiliaria.ai.naira.preguntar.sugerencias.ficha' })
        break
      default: {
        const _exhaustivo: never = puede
        return _exhaustivo
      }
    }
  }
  return salida
}

/** Una métrica por dominio para el vacío de la conversación (sin números). */
export const METRICAS_DE_EJEMPLO = ['cartera.morosidad_rate', 'portafolio.available_units_count', 'prospectos.leads_sin_contacto_count'] as const

/**
 * Las sugerencias del vacío: las de METRICAS_DE_EJEMPLO que el rol puede ver (`puedeVer`, el proxy de visibilidad de P9)
 * y cuyo nombre conoce el panel.
 */
export function sugerenciasIniciales(puedeVer: (metricId: string) => boolean): readonly SugerenciaDePregunta[] {
  const salida: SugerenciaDePregunta[] = []
  for (const id of METRICAS_DE_EJEMPLO) {
    const nombre = nombreConversacional(id)
    if (nombre !== null && puedeVer(id)) salida.push({ kind: 'metrica', etiqueta: nombre, pregunta: preguntaSugerida(nombre) })
  }
  return salida
}
