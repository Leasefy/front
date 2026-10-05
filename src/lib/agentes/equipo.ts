import type { AgentOrbPaletteName } from '@leasefy/cadence'

import { NOMBRE_DEL_ORQUESTADOR, ORBE_DEL_ORQUESTADOR } from './nombre-del-orquestador'

/**
 * ══ EL EQUIPO DE AGENTES — UN SOLO REGISTRO ═══════════════════════════════
 *
 * Quién es cada agente, qué hace y qué NO hace, con quién trabaja, en qué
 * frente va, cómo se ve su orbe y cómo se llama en lo que manda el micro. Lo
 * leen el modal «El equipo», el orbe de cada agente y el mapeo de los eventos
 * del chat (`agente-que-habla.ts`).
 *
 * ── De dónde sale cada dato (02-10-2026) ─────────────────────────────────────
 *
 * Del CÓDIGO del micro (`wt-agent-bugs`, rama bugs-nico-1), no de la memoria:
 * cada agente lista sus `fuentes`. Las frases viven en i18n
 * (`agentes.<id>.*`, es y en). Lo dudoso NO entró.
 *
 *   · Nombres propios: los `name` de los `Agent` de Mastra y el catálogo del
 *     piloto automático (`piloto/catalogo.ts` → `NOMBRES`). Desde el commit
 *     `046af379` del micro (bugs-nico-1) **Cobri** (antes «Payu»), **Niti**
 *     (antes «Gaby») y **Fixi** (antes «Martín») son los nombres en el código.
 *   · Hace / No hace: herramientas (`createTool`), guardas del prompt y de la
 *     ruta, y la tabla de verdad de la perilla (`piloto/que-hace-cada-modo.ts`
 *     y los procesos de `piloto/perilla.ts`).
 *   · `autonomia`: el id en `GET /ai-hub/autonomia` (la flota: `corre`,
 *     `actua`, `modo`, `efectoReal`). Es lo ÚNICO que dice si un agente está
 *     activo para esta inmobiliaria; sin fila, no se afirma nada.
 *   · `despachos`: las claves que el micro manda en `dispatch_start.agent`,
 *     `tool_step.agent`, `dispatch_result.dispatch.agent` y
 *     `done.dispatches[].agent` (`DispatchAgentKeySchema`), y que el front
 *     guarda en `AgentExecution.agentType`. Ojo: el despacho dice `avaluo` y la
 *     flota `avaluos`. Desde el commit `33d8607b` del micro cada despacho trae
 *     además su id (`dispatch_start.id`, `tool_step.dispatchId`, `dispatch.id`,
 *     `done.dispatches[].id`) y el `done` trae el razonamiento del turno
 *     (`razonamiento: [{ agente?, texto }]`, «Cómo lo pensó»); el `agente` de
 *     una frase es una de estas mismas claves.
 */

export type IdDeAgente =
  | 'orquestador'
  | 'cobranza'
  | 'pagos'
  | 'conciliacion'
  | 'contratos'
  | 'propietarios'
  | 'retencion'
  | 'aprobaciones'
  | 'facturacion'
  | 'contabilidad'
  | 'prospectos'
  | 'calidad'
  | 'matching'
  | 'estudio'
  | 'cotizador'
  | 'avaluos'
  | 'mantenimiento'
  | 'inspeccion'
  | 'documentos'
  | 'reportes'
  | 'comunicacion'

export type IdDeFrente =
  | 'direccion'
  | 'cartera'
  | 'contratos'
  | 'contabilidad'
  | 'comercial'
  | 'riesgo'
  | 'mantenimiento'
  | 'consultas'

/** El orden en que se pintan los frentes. */
export const FRENTES: readonly IdDeFrente[] = [
  'direccion',
  'cartera',
  'contratos',
  'contabilidad',
  'comercial',
  'riesgo',
  'mantenimiento',
  'consultas',
]

export interface ItemQueNoHace {
  /** Clave en `agentes.<id>.noHace.<clave>`. */
  clave: string
  /** «→ eso lo hace X» */
  loHace?: IdDeAgente
}

export interface OrbeDelAgente {
  paleta: AgentOrbPaletteName
  semilla: string
  variante: 'agent' | 'orchestrator'
}

export interface AgenteDelEquipo {
  id: IdDeAgente
  /**
   * Nombre propio (no se traduce: Laura es Laura en inglés). `null` = nombre
   * funcional, que sí se traduce (`agentes.<id>.nombre`).
   */
  nombrePropio: string | null
  frente: IdDeFrente
  orbe: OrbeDelAgente
  /** Id en la flota del piloto automático (`GET /ai-hub/autonomia`). */
  autonomia: string | null
  /** Claves con que el micro lo nombra en los eventos del chat. Vacío = el chat no lo llama. */
  despachos: readonly string[]
  /** Claves en `agentes.<id>.hace.<k>`. */
  hace: readonly string[]
  noHace: readonly ItemQueNoHace[]
  /** Claves en `agentes.herramientas.<k>`. */
  herramientas: readonly string[]
  trabajaCon: readonly IdDeAgente[]
  /** A quién le reporta: otro agente o `equipo` (tu equipo, las personas). */
  reportaA: IdDeAgente | 'equipo'
  /** Archivos del micro de donde sale lo que se dice (para mantenerlo, no se pinta). */
  fuentes: readonly string[]
}

const orbe = (paleta: AgentOrbPaletteName, semilla: string): OrbeDelAgente => ({
  paleta,
  semilla,
  variante: 'agent',
})

export const EQUIPO: readonly AgenteDelEquipo[] = [
  {
    id: 'orquestador',
    nombrePropio: NOMBRE_DEL_ORQUESTADOR,
    frente: 'direccion',
    orbe: { ...ORBE_DEL_ORQUESTADOR, variante: 'orchestrator' },
    autonomia: 'chat',
    despachos: [],
    hace: ['contesta', 'reparte', 'busca', 'prepara', 'analiza'],
    noHace: [
      { clave: 'sinClic' },
      { clave: 'deudores', loHace: 'cobranza' },
      { clave: 'otraInmobiliaria' },
      { clave: 'cifras' },
    ],
    herramientas: ['busqueda', 'ficha', 'cartera', 'especialistas', 'confirmacion'],
    trabajaCon: ['cobranza', 'pagos', 'conciliacion', 'cotizador', 'estudio', 'matching', 'avaluos', 'documentos', 'reportes', 'comunicacion'],
    reportaA: 'equipo',
    fuentes: [
      'src/mastra/agents/chat/chat-orchestrator.ts',
      'src/mastra/agents/chat/dispatch-tools.ts',
      'src/ai-hub/chat-enrutador.ts',
      'src/ai-hub/en-el-chat/compuerta.ts',
      'src/piloto/que-hace-cada-modo.ts (chat)',
    ],
  },
  {
    id: 'cobranza',
    nombrePropio: 'Laura',
    frente: 'cartera',
    orbe: orbe('coral', 'cobranza'),
    autonomia: 'cobranza',
    despachos: ['cobranza'],
    hace: ['llama', 'whatsapp', 'acuerdos', 'identidad', 'resume'],
    noHace: [{ clave: 'horario' }, { clave: 't323' }, { clave: 'verifica' }],
    herramientas: ['voz', 'whatsapp', 'correo', 'cartera', 'bandeja'],
    trabajaCon: ['pagos', 'conciliacion', 'orquestador'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/cobranza/** (voice-conductor, negotiation-strategist, identity-verifier, call-summarizer, qa-scorer, whatsapp-*)',
      'src/cartera/scripts/templates/es/s2.ts («habla Laura de …»)',
      'src/voice/skill-context.ts:88-90 (verificar un pago es un acto humano)',
      'src/piloto/que-hace-cada-modo.ts (cobranza, vallas Ley 2300 y T-323)',
    ],
  },
  {
    id: 'pagos',
    nombrePropio: 'Cobri',
    frente: 'cartera',
    orbe: orbe('jade', 'pagos'),
    autonomia: 'pagos',
    despachos: ['pagos'],
    hace: ['cobro', 'envia', 'fallidos', 'liquidacion', 'cierre'],
    noHace: [{ clave: 'link' }, { clave: 'aprueba', loHace: 'propietarios' }, { clave: 'masivo' }],
    herramientas: ['wompi', 'whatsapp', 'correo', 'bandeja'],
    trabajaCon: ['cobranza', 'conciliacion', 'propietarios'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/pagos/payu.ts (el conductor: `name: \'Cobri\'`; el archivo conserva el nombre viejo)',
      'src/mastra/agents/pagos/{laura,nicolas,valentina,samuel,sofia}.ts',
      'src/mastra/agents/pagos/payments-orientation.ts (lo que contesta en el chat)',
      'src/piloto/que-hace-cada-modo.ts (pagos, valla de links)',
    ],
  },
  {
    id: 'conciliacion',
    nombrePropio: null,
    frente: 'cartera',
    orbe: orbe('lagoon', 'conciliacion'),
    autonomia: 'conciliacion',
    despachos: ['conciliacion'],
    hace: ['candidatos', 'referencia', 'exacto', 'diagnostico'],
    noHace: [{ clave: 'giro', loHace: 'propietarios' }, { clave: 'aplica' }],
    herramientas: ['extractos', 'recibos', 'bandeja'],
    trabajaCon: ['pagos', 'cobranza', 'facturacion', 'contabilidad'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/conciliacion/reconciliation-matcher.ts (fetchCandidates, extractHints)',
      'src/mastra/agents/conciliacion/reconciliation-advisor.ts (el chat: sólo sugiere)',
      'src/piloto/que-hace-cada-modo.ts (conciliacion)',
    ],
  },
  {
    id: 'contratos',
    nombrePropio: null,
    frente: 'contratos',
    orbe: orbe('indigo', 'contratos'),
    autonomia: 'contratos',
    despachos: [],
    hace: ['prorroga', 'firma', 'portal', 'vencimiento', 'renovacion'],
    noHace: [{ clave: 'termina' }, { clave: 'propuesta' }],
    herramientas: ['correo', 'portal', 'bandeja'],
    trabajaCon: ['propietarios', 'facturacion', 'retencion'],
    reportaA: 'equipo',
    fuentes: ['src/piloto/perilla.ts (contratos.*, gerente.renovacion_*, gerente.carta_incremento_*, gerente.firma_por_vencer)'],
  },
  {
    id: 'propietarios',
    nombrePropio: null,
    frente: 'contratos',
    orbe: orbe('terracotta', 'propietarios'),
    autonomia: 'propietarios',
    despachos: [],
    hace: ['extracto', 'liquidacion'],
    noHace: [{ clave: 'giro' }],
    herramientas: ['correo', 'portal', 'bandeja'],
    trabajaCon: ['pagos', 'conciliacion', 'contabilidad', 'retencion'],
    reportaA: 'equipo',
    fuentes: ['src/piloto/perilla.ts (propietarios.*, gerente.liquidacion_del_mes)'],
  },
  {
    id: 'retencion',
    nombrePropio: 'Vinci',
    frente: 'contratos',
    orbe: orbe('amethyst', 'retencion'),
    autonomia: 'retencion',
    despachos: [],
    hace: ['riesgo', 'prioriza', 'plan', 'vallas', 'barrido'],
    noHace: [{ clave: 'escribe' }, { clave: 'presiona' }, { clave: 'inquilino' }],
    herramientas: ['whatsapp', 'bandeja'],
    trabajaCon: ['contratos', 'propietarios'],
    reportaA: 'equipo',
    fuentes: [
      'src/mastra/agents/retencion/vinci-agent.ts (8 herramientas, cerca de cumplimiento)',
      'src/piloto/que-hace-cada-modo.ts (retencion)',
    ],
  },
  {
    id: 'aprobaciones',
    nombrePropio: 'Avali',
    frente: 'contratos',
    orbe: orbe('peach', 'aprobaciones'),
    autonomia: 'aprobaciones',
    despachos: [],
    // MANOS-1 (04-10-2026): las manos de Avali viven en el back (campana del portal + correo).
    hace: ['pide', 'recuerda', 'escala', 'mueve'],
    noHace: [{ clave: 'ejecuta' }],
    herramientas: ['portal', 'correo', 'bandeja'],
    trabajaCon: ['mantenimiento', 'propietarios'],
    reportaA: 'equipo',
    fuentes: [
      'back: src/inmobiliaria/aprobaciones-del-propietario/avali-del-piloto.service.ts (pedir escoger inquilino, recordar, escalar, adjudicar con clic)',
      'src/piloto/que-hace-cada-modo.ts (aprobaciones)',
    ],
  },
  {
    id: 'facturacion',
    nombrePropio: null,
    frente: 'contabilidad',
    orbe: orbe('mint', 'facturacion'),
    autonomia: 'facturacion',
    despachos: [],
    hace: ['facturas', 'anticipo', 'sinEmitir'],
    noHace: [{ clave: 'dian' }],
    herramientas: ['recibos', 'bandeja'],
    trabajaCon: ['conciliacion', 'contabilidad', 'pagos'],
    reportaA: 'equipo',
    fuentes: ['src/piloto/perilla.ts (facturacion.*, gerente.facturas_sin_emitir)'],
  },
  {
    id: 'contabilidad',
    nombrePropio: null,
    frente: 'contabilidad',
    orbe: orbe('slate', 'contabilidad'),
    autonomia: 'contabilidad',
    despachos: [],
    hace: ['egreso', 'libro', 'causa'],
    noHace: [{ clave: 'lote' }, { clave: 'causaSola' }],
    herramientas: ['centroDeProcesos', 'bandeja'],
    trabajaCon: ['facturacion', 'conciliacion', 'propietarios'],
    reportaA: 'equipo',
    fuentes: ['src/piloto/perilla.ts (contabilidad.*)'],
  },
  {
    id: 'prospectos',
    nombrePropio: 'Imana',
    frente: 'comercial',
    orbe: orbe('orchid', 'prospectos'),
    autonomia: 'prospectos',
    despachos: [],
    // MANOS-2 (04-10-2026): las manos de Imana viven en el back (responder al interesado, agendar la visita).
    hace: ['responde', 'visita', 'inventario', 'similares', 'pipeline', 'asesores'],
    noHace: [{ clave: 'precio' }, { clave: 'escribe' }, { clave: 'protegidos' }],
    herramientas: ['inventario', 'agenda', 'pipeline'],
    trabajaCon: ['matching', 'calidad'],
    reportaA: 'equipo',
    fuentes: [
      'src/mastra/agents/prospectos/agent.ts (buscarInventario, verificarDisponibilidad, buscarSimilares, rankearInventario, proponerSlots, agendarVisita)',
      'src/mastra/agents/prospectos/copiloto/copiloto-agent.ts (priorizarPipeline, leadsEnfriandose, metricasAsesor)',
      'back: src/inmobiliaria/agenda/imana/imana-del-piloto.service.ts (responder al interesado, agendar la visita)',
      'src/piloto/que-hace-cada-modo.ts (prospectos)',
    ],
  },
  {
    id: 'calidad',
    nombrePropio: 'Niti',
    frente: 'comercial',
    orbe: orbe('marigold', 'calidad'),
    autonomia: 'calidad',
    despachos: [],
    // MANOS-2 (04-10-2026): Niti arregla la ficha en el back y le deja al asesor lo que falta.
    hace: ['audita', 'arregla', 'tarea', 'prioriza'],
    noHace: [{ clave: 'edita' }, { clave: 'propietario' }],
    herramientas: ['inventario', 'portales', 'bandeja'],
    trabajaCon: ['prospectos', 'propietarios'],
    reportaA: 'equipo',
    fuentes: [
      'src/mastra/agents/calidad-publicacion/agent.ts (`name: \'Niti · calidad\'`)',
      'back: src/inmobiliaria/publicacion/niti/niti-del-piloto.service.ts (arreglar la ficha, la tarea al asesor, el tomado)',
      'src/piloto/que-hace-cada-modo.ts (calidad)',
    ],
  },
  {
    id: 'matching',
    nombrePropio: null,
    frente: 'comercial',
    orbe: orbe('lime', 'matching'),
    autonomia: 'matching',
    despachos: ['matching'],
    // MANOS-2 (04-10-2026): la lista corta y las opciones al interesado nuevo, en el back.
    hace: ['listaCorta', 'interesado', 'compatibilidad', 'correo', 'envia'],
    noHace: [{ clave: 'unSolo' }, { clave: 'sinVistoBueno' }],
    herramientas: ['inventario', 'correo'],
    trabajaCon: ['estudio', 'prospectos'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/matching/smart-matching.ts (calculateCompatibility)',
      'src/mastra/agents/matching/suggestion-email.ts',
      'back: src/inmobiliaria/matching/matching-del-piloto.service.ts (lista corta, opciones al interesado)',
      'src/piloto/que-hace-cada-modo.ts (matching)',
    ],
  },
  {
    id: 'estudio',
    nombrePropio: null,
    frente: 'riesgo',
    orbe: orbe('rose', 'estudio'),
    autonomia: 'estudio',
    despachos: ['estudio'],
    hace: ['documentos', 'puntaje'],
    noHace: [{ clave: 't323' }, { clave: 'solo' }],
    herramientas: ['documentos'],
    trabajaCon: ['cotizador', 'matching'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/validador/tenant-scoring.ts (extractDocumentData, calculateScore)',
      'src/piloto/que-hace-cada-modo.ts (estudio, T-323)',
    ],
  },
  {
    id: 'cotizador',
    nombrePropio: null,
    frente: 'riesgo',
    orbe: orbe('sky', 'cotizador'),
    autonomia: 'cotizador',
    despachos: ['cotizador'],
    hace: ['cotiza', 'revisa', 'explica'],
    noHace: [{ clave: 'solo' }, { clave: 'chat' }],
    herramientas: ['aseguradoras'],
    trabajaCon: ['estudio'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/cotizador/quote-orchestrator.ts (quoteSura, quoteMapfre, quoteBolivar, quoteFianly, screenCandidate)',
      'src/mastra/agents/cotizador/explainability/**, counterfactual/**',
      'src/piloto/que-hace-cada-modo.ts (cotizador)',
    ],
  },
  {
    id: 'avaluos',
    nombrePropio: null,
    frente: 'riesgo',
    orbe: orbe('copper', 'avaluos'),
    autonomia: 'avaluos',
    despachos: ['avaluo'],
    // MANOS-2 (04-10-2026): el precio contra la vacancia, en el back.
    hace: ['vacancia', 'solicitud', 'orienta'],
    noHace: [{ clave: 'vinculante' }, { clave: 'solo' }],
    herramientas: ['avaluos'],
    trabajaCon: ['orquestador'],
    reportaA: 'orquestador',
    fuentes: [
      'src/mastra/agents/avaluo/avaluo-proxy-tool.ts (abre la solicitud en el servicio de avalúos)',
      'src/mastra/agents/avaluo/chat-orientation.ts (respaldo: orientación)',
      'back: src/inmobiliaria/comercial/precio/precio-del-piloto.service.ts (preguntarle al propietario por el canon, cambiarlo, pedir el avalúo)',
      'src/piloto/que-hace-cada-modo.ts (avaluos)',
    ],
  },
  {
    id: 'mantenimiento',
    nombrePropio: 'Fixi',
    frente: 'mantenimiento',
    orbe: orbe('tangerine', 'mantenimiento'),
    autonomia: 'mantenimiento',
    // El micro NO lo despacha desde el chat (no está en `DispatchAgentKeySchema`):
    // `mantenimiento` en `AgentType` del front es una categoría vieja.
    despachos: [],
    // MANOS-1 (04-10-2026): las manos de Fixi viven en el back (cotizaciones, propuesta, seguimiento).
    hace: ['clasifica', 'cotiza', 'propone', 'sigue', 'fotos'],
    noHace: [{ clave: 'veredicto' }, { clave: 'aprueba', loHace: 'aprobaciones' }],
    herramientas: ['correo', 'vision', 'bandeja'],
    trabajaCon: ['aprobaciones', 'inspeccion'],
    reportaA: 'equipo',
    fuentes: [
      'back: src/inmobiliaria/mantenimiento/fixi/fixi-del-piloto.service.ts (pedir cotizaciones, proponer, pedir la aprobación, seguimiento)',
      'src/mastra/agents/mantenimiento/agent.ts (classifyTicket, analyzeDamagePhoto, estimateResponsible, computePriority, estimateCost, evaluateApproval)',
      'src/piloto/que-hace-cada-modo.ts (mantenimiento)',
    ],
  },
  {
    id: 'inspeccion',
    nombrePropio: 'Vidi',
    frente: 'mantenimiento',
    orbe: orbe('glacier', 'inspeccion'),
    // MANOS-1 (04-10-2026): Vidi entra a la flota con su propio modo; sus manos viven en el back.
    autonomia: 'inspeccion',
    despachos: [],
    hace: ['agenda', 'acta', 'compara', 'propone'],
    noHace: [{ clave: 'cobra' }],
    herramientas: ['agenda', 'inventario', 'bandeja'],
    trabajaCon: ['mantenimiento', 'aprobaciones'],
    reportaA: 'equipo',
    fuentes: [
      'back: src/inmobiliaria/actas/vidi/vidi-del-piloto.service.ts (agendar entrada y salida, comparar y proponer descuentos con clic)',
      'src/mastra/agents/inspeccion/agent.ts (visión y firma; INSPECCION_ENABLED, apagado)',
    ],
  },
  {
    id: 'documentos',
    nombrePropio: null,
    frente: 'consultas',
    orbe: orbe('sand', 'documentos'),
    autonomia: null,
    despachos: ['documentos'],
    hace: ['encuentra', 'cita', 'sinTexto'],
    noHace: [{ clave: 'completa' }, { clave: 'juridico' }],
    herramientas: ['tusDocumentos'],
    trabajaCon: ['orquestador'],
    reportaA: 'orquestador',
    fuentes: ['src/mastra/agents/documentos/documentos-agent.ts'],
  },
  {
    id: 'reportes',
    nombrePropio: null,
    frente: 'consultas',
    orbe: orbe('plum', 'reportes'),
    autonomia: null,
    despachos: ['reportes'],
    hace: ['consulta', 'busca', 'explica'],
    noHace: [{ clave: 'cambia' }, { clave: 'rol' }],
    herramientas: ['consultas', 'busqueda'],
    trabajaCon: ['orquestador'],
    reportaA: 'orquestador',
    fuentes: ['src/mastra/agents/consulta/consulta-libre-agent.ts (consultaLibre, buscar_en_la_plataforma)'],
  },
  {
    id: 'comunicacion',
    nombrePropio: null,
    frente: 'consultas',
    orbe: orbe('ocean', 'comunicacion'),
    autonomia: null,
    despachos: ['comunicacion'],
    hace: ['prepara', 'destinatarios'],
    noHace: [{ clave: 'sinConfirmar' }, { clave: 'plata' }],
    herramientas: ['whatsapp', 'correo', 'confirmacion'],
    trabajaCon: ['orquestador', 'cobranza'],
    reportaA: 'orquestador',
    fuentes: ['src/mastra/agents/chat/acciones-tool.ts (recordatorio_pago, mensaje_directo, crear_pqrs; vence a los 10 min)'],
  },
]

const POR_ID = new Map<IdDeAgente, AgenteDelEquipo>(EQUIPO.map((a) => [a.id, a]))
const POR_DESPACHO = new Map<string, AgenteDelEquipo>(
  EQUIPO.flatMap((a) => a.despachos.map((d) => [d, a] as const)),
)
const POR_AUTONOMIA = new Map<string, AgenteDelEquipo>(
  EQUIPO.filter((a) => a.autonomia).map((a) => [a.autonomia as string, a]),
)

export function agentePorId(id: IdDeAgente): AgenteDelEquipo {
  return POR_ID.get(id) as AgenteDelEquipo
}

export function esIdDeAgente(v: unknown): v is IdDeAgente {
  return typeof v === 'string' && POR_ID.has(v as IdDeAgente)
}

/** El orquestador: el que contesta en el chat. */
export function orquestador(): AgenteDelEquipo {
  return agentePorId('orquestador')
}

/**
 * El agente detrás de una clave del micro (`dispatch_*.agent`,
 * `AgentExecution.agentType`, `TurnStep.agentType`). `null` si la clave no es
 * de nadie del equipo (p. ej. las categorías viejas `pipeline`): quien pinte
 * no inventa un agente, se queda con el orquestador.
 */
export function agenteDelDespacho(clave: string | null | undefined): AgenteDelEquipo | null {
  if (!clave) return null
  return POR_DESPACHO.get(clave) ?? null
}

/** El agente de una fila de la flota (`GET /ai-hub/autonomia`). */
export function agenteDeLaAutonomia(id: string | null | undefined): AgenteDelEquipo | null {
  if (!id) return null
  return POR_AUTONOMIA.get(id) ?? null
}

type T = (clave: string, params?: Record<string, string | number>) => string

/** El nombre que se pinta: el propio o el funcional traducido. */
export function nombreDelAgente(agente: AgenteDelEquipo, t: T): string {
  return agente.nombrePropio ?? t(`agentes.${agente.id}.nombre`)
}

/** Agentes de un frente, en el orden del registro. */
export function agentesDelFrente(frente: IdDeFrente): AgenteDelEquipo[] {
  return EQUIPO.filter((a) => a.frente === frente)
}

/** ¿El chat lo puede llamar hoy? (tiene al menos una clave de despacho) */
export function loLlamaElChat(agente: AgenteDelEquipo): boolean {
  return agente.id === 'orquestador' || agente.despachos.length > 0
}
