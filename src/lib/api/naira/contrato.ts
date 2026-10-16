/**
 * contrato.ts — espejo del contrato HTTP de Naira (servicio de agentes → front), Fase 13 plan 13-01.
 *
 * MIRROR escrito a mano contra el contrato del agente — no inventar campos; manda el disco.
 * Cada esquema lleva encima `// fuente:` (archivo:líneas del agente o plan:líneas de su <contrato_publicado>) y
 * `// estado:` (EXISTE = código de la rama project/account-manager de agent-account-manager; PLANIFICADO = texto de un
 * <contrato_publicado> todavía sin ejecutar). Si el agente ejecuta un plan y su código difiere, manda su código.
 *
 * Los 17 endpoints (ruta relativa a NAIRA_BASE = '/api/agency/{agencyId}/naira'):
 *
 *   memoria.vista              GET  /memory                                           EXISTE       (Fase 8, naira-memory.ts)
 *   memoria.corregir           POST /memory/items/{itemId}/correction                 EXISTE       (Fase 8, naira-memory.ts)
 *   memoria.borrar             POST /memory/items/{itemId}/erasure                    EXISTE       (Fase 8, naira-memory.ts)
 *   memoria.resolverPropuesta  POST /memory/procedural/proposals/{proposalId}/resolution  EXISTE   (Fase 8, naira-memory.ts)
 *   memoria.promover           POST /memory/items/{itemId}/promotion                  PLANIFICADO  (11-07)
 *   conversacion.preguntar     POST /conversation/questions                           PLANIFICADO  (9.5-06)
 *   briefing.dia               GET  /briefing?dia=YYYY-MM-DD                          PLANIFICADO  (10-06)
 *   senal.detalle              GET  /signals/{promocionId}                            PLANIFICADO  (10-06)
 *   recall.responder           POST /recall                                           PLANIFICADO  (10-06)
 *   senal.voto                 POST /signals/{promocionId}/feedback                   PLANIFICADO  (11-07)
 *   seguimiento.lista          GET  /open-loops                                       PLANIFICADO  (11-07)
 *   seguimiento.detalle        GET  /open-loops/{loopId}                              PLANIFICADO  (11-07)
 *   acciones.lista             GET  /actions                                          PLANIFICADO  (12-07)
 *   acciones.detalle           GET  /actions/{proposalId}                             PLANIFICADO  (12-07)
 *   acciones.decidir           POST /actions/{proposalId}/decision                    PLANIFICADO  (12-07)
 *   tareas.lista               GET  /tasks                                            PLANIFICADO  (12-07)
 *   tareas.cancelar            POST /tasks/{tareaId}/cancel                           PLANIFICADO  (12-07)
 *
 * Regla D13-5 (dos modos, UN solo árbol): todo el árbol se arma en `construirEsquemas(estricto)`.
 *   · En ejecución (modo tolerante) ningún objeto es estricto: el `strip` por defecto de zod QUITA en todos los niveles lo
 *     que el agente agregue (un campo nuevo no rompe y tampoco llega a ningún componente: defensa B-5, D13-11).
 *   · En tests (modo estricto) TODO objeto es estricto: el `.strict()` de zod 3 es superficial, por eso cada objeto pasa
 *     por un único helper y el modo se decide ahí (P2). Un campo inventado o renombrado en cualquier nivel es rojo.
 *
 * Enmiendas del agente que este espejo CONSUME (D13-23, RB-9): E13-2 (`entidades` de NairaBriefingItem, requerido: es
 * uno de los 14 campos de ItemCongelado), E13-3 (`citasConClase`), E13-4 (`oraciones` y `refs`), E13-6 (`asOfs` de
 * cada acción), E13-7 (`RAZON_NAIRA_NO_HABILITADA` en el 404 de `apagada`) y E13-13 (`valorRenderizado` y
 * `nombreDeMetrica`). Los campos de E13-3/E13-4/E13-6/E13-13 son OPCIONALES en el tolerante (un agente que todavía no
 * los sirve no rompe) y REQUERIDOS en el estricto (los ejemplos los traen). E13-5 (inventario del silencio) NO está
 * aplicada en el agente: el espejo refleja el contrato de hoy y no tiene inventario.
 *
 * Dos nodos opacos (P3): `NairaOpenLoopEvent.memoria` y `NairaOpenLoopEvent.verificacion` se espejan solo por su `kind`
 * y dejan pasar el resto en los DOS modos: su interior viene de tipos de dos planes del agente sin ejecutar (11-01 y
 * 11-05), ninguna vista de la Fase 13 lo pinta y copiarlo a ciegas fijaría nombres que nadie midió.
 * `NODOS_OPACOS_DE_NAIRA` los nombra; un test recorre el árbol y exige que sean los únicos.
 *
 * El cuerpo de error de toda ruta de Naira es `{ error, reason }`, salvo el 403 del middleware de roles
 * (`src/server/middleware/agency-role.ts:233`), que no trae `reason`: por eso aquí `reason` es opcional.
 */

import { z } from 'zod'

// ── Vocabularios del contrato (valores EXACTOS del agente) ──────────────────────────────────────────────────────────

// fuente: src/naira/memory/types.ts:47 (EXISTE)
export const PERSISTED_MEMORY_LAYERS = ['episodic', 'semantic', 'preference', 'procedural'] as const
// fuente: src/naira/memory/types.ts:55 (EXISTE)
export const PROVENANCE_KINDS = ['observed', 'inferred', 'stated_by_human'] as const
// fuente: src/naira/fact/types.ts:67 (EXISTE)
export const TRUST_LEVELS = ['system', 'staff', 'third_party'] as const
// fuente: src/naira/memory/erasure.ts:64 (EXISTE)
export const ERASURE_REASONS = ['solicitud_del_titular', 'decision_de_la_agencia'] as const
// fuente: src/naira/memory/human-actions.ts:71 (EXISTE)
export const PROPOSAL_DECISIONS = ['confirm', 'reject'] as const
// fuente: src/naira/metrics/dimensions.ts:78-91 (EXISTE)
export const DIMENSIONS = [
  'stage',
  'guarantee_status',
  'channel',
  'payment_provider',
  'payment_method',
  'discount_kind',
  'stage_at_offer',
  'urgency',
  'dispute_status',
  'city',
  'property_type',
  'stratum',
] as const
// fuente: src/naira/metrics/types.ts:33 (EXISTE, `MetricUnit`)
export const METRIC_UNITS = ['pct', 'cop', 'count', 'days'] as const
// fuente: src/naira/detect/types.ts:102-106 (EXISTE, `UrgencyClass`)
export const URGENCY_CLASSES = ['ventana_legal', 'irreversible', 'degradacion_con_realimentacion', 'reversible'] as const
// fuente: src/naira/detect/types.ts:29 (EXISTE, `DetectorClass`)  // +
export const CLASES_DE_DETECTOR = ['state', 'trend'] as const
// fuente: src/naira/attribution/types.ts:362 (EXISTE, `DomainRole`)
export const DOMAIN_ROLES = ['cartera', 'portafolio', 'prospectos'] as const
// fuente: 11-03-PLAN.md (`OwnerDeLoop` = `role:${DomainRole}`) y 12-07-PLAN.md:390 (`DuenoDeTarea`)
export const DUENOS_DE_ROL = ['role:cartera', 'role:portafolio', 'role:prospectos'] as const
// fuente: 9.5-01-PLAN.md:248-250 (PLANIFICADO)
export const RAZONES_DE_NEGATIVA = [
  'fuera_de_catalogo',
  'instruccion',
  'accion_en_fase_12',
  'dimension_de_persona',
  'eje_no_disponible',
  'bajo_k',
  'metrica_no_visible_para_el_rol',
  'documento_no_buscable_en_v1',
  'fuente_rancia',
  'presupuesto_agotado',
] as const
// fuente: 09-03-PLAN.md:152 (PLANIFICADO)
export const MOTIVOS_DE_BLOQUEO = ['numeric_drift', 'causal_sin_clase', 'vocabulario_fuera_de_adr', 'categoria_inconsistente'] as const
// fuente: 9.5-01-PLAN.md:263 (PLANIFICADO)
export const RAZONES_DE_FALLA = ['registro_no_escrito', 'cupo_no_reservado', 'lectura_fallida'] as const
// fuente: 9.5-01-PLAN.md:255 (PLANIFICADO)
export const CARRILES_NO_SERVIDOS = ['grafo_sin_filtro_de_rol'] as const
// fuente: 10-CONTEXT.md:228 ('atencion'..'semanal') + 11-CONTEXT.md:409 ('seguimiento', 11-06) (PLANIFICADO)
export const SECCIONES_DEL_BRIEFING = ['atencion', 'informativo', 'estado', 'semanal', 'seguimiento'] as const
// fuente: 10-06-PLAN.md:331 (PLANIFICADO)
export const RAZONES_SIN_BRIEFING = ['antes_del_corte', 'briefing_apagado', 'sin_entregas_del_tenant', 'sin_entrega_para_el_llamador'] as const
// fuente: 10-06-PLAN.md:332 (PLANIFICADO)
export const RAZONES_DE_CAUSA_NO_CITABLE = [
  'sin_investigacion_al_congelar',
  'fila_ilegible',
  'no_visible_para_el_rol',
  'con_datos_de_terceros',
  'sin_explicacion',
] as const
// fuente: 10-CONTEXT.md:315 (PLANIFICADO)  // +
export const CANALES_DE_ENTREGA = ['email', 'whatsapp'] as const
// fuente: 10-06-PLAN.md:333 y 10-CONTEXT.md (PLANIFICADO)  // +
export const TIPOS_DE_ENTREGA = ['briefing', 'aviso_suspension'] as const
// fuente: 10-06-PLAN.md:333-334 (PLANIFICADO)  // +
export const ESTADOS_DEL_ENVIO = ['sin_despacho', 'enviado', 'stub', 'solo_fallidos'] as const
// fuente: 11-CONTEXT.md:309-319 (PLANIFICADO)
export const ESTADOS_DEL_LOOP = ['abierto', 'en_seguimiento', 'escalado', 'en_confirmacion', 'cerrado'] as const
// fuente: 11-CONTEXT.md:309-319 (PLANIFICADO)
export const FORMAS_DEL_LOOP = ['recordatorio', 'impacto', 'escalada'] as const
// fuente: 11-CONTEXT.md:309-319 (PLANIFICADO)
export const DESENLACES_DEL_LOOP = ['resuelto_por_dato', 'no_accionado', 'sin_reincidencia', 'expirado'] as const
// fuente: 11-CONTEXT.md:309-319 (PLANIFICADO)
export const TIPOS_DE_EVENTO_DEL_LOOP = [
  'nacimiento',
  'ciclo',
  'cambio_de_forma',
  'en_confirmacion',
  'confirmacion_fallida',
  'no_verificable',
  'cierre',
] as const
// fuente: 11-CONTEXT.md:357 (PLANIFICADO)
export const RAZONES_DE_DUENO_DE_LOOP = [
  'sin_fuente_de_asignacion',
  'denominador_por_debajo_de_r_min',
  'sin_denominador_basal',
  'finalidad_no_autorizada',
  'persona_espera_b5',
] as const
// fuente: 11-CONTEXT.md:309-319 (PLANIFICADO)
export const VALORES_DE_FEEDBACK = ['util', 'no_util', 'ya_lo_sabia'] as const
// fuente: 11-03-PLAN.md:400 (PLANIFICADO; nodo opaco, P3)  // +
export const KINDS_DE_MEMORIA_DEL_EVENTO = ['ninguna', 'candidata', 'confirmada', 'corregida', 'corregida_y_candidata'] as const
// fuente: 11-03-PLAN.md:399 (PLANIFICADO; nodo opaco, P3)  // +
export const KINDS_DE_VERIFICACION_DEL_EVENTO = ['nacimiento', 'del_dia', 'sin_veredicto'] as const
// fuente: 12-01-PLAN.md:213-223 (PLANIFICADO)
export const TIPOS_DE_ACCION = ['crear_tarea', 'asignar_tarea', 'aviso_interno', 'despachar_vertical'] as const
// fuente: 12-01-PLAN.md:213-223 (PLANIFICADO)
export const CLASES_DE_CONSECUENCIA = ['interna_reversible', 'interna_irreversible', 'externa'] as const
// fuente: 12-07-PLAN.md:372 (PLANIFICADO)
export const ESTADOS_DE_LA_PROPUESTA = ['pendiente', 'vencible', 'aprobada', 'rechazada', 'vencida', 'ejecutada', 'no_ejecutada'] as const
// fuente: 12-03-PLAN.md:321,330 ('abierta' | TIPOS_DE_CIERRE_DE_TAREA) (PLANIFICADO)
export const ESTADOS_DE_TAREA = ['abierta', 'cancelada', 'cerrada_por_loop'] as const
// fuente: 12-07-PLAN.md:377 (PLANIFICADO; el orden es el de evaluación del agente)
export const RAZONES_DE_CONFLICTO_DE_DECISION = [
  'clase_incoherente',
  'vencida',
  'no_reproducible',
  'huella_distinta',
  'procedencia_no_disponible',
  'ya_decidida',
] as const
// fuente: 12-07-PLAN.md:374 (PLANIFICADO; llegan como 403 CON reason)
export const RAZONES_DE_RECHAZO_POR_CLASE = ['canal_no_permitido_para_la_clase', 'sin_permiso_de_la_clase'] as const
// fuente: src/naira/investigation/lint/contrato-de-salida.ts:56 (EXISTE)
export const CLAIM_CLASSES = ['aritmetica', 'asociacion', 'hipotesis'] as const
// fuente: src/naira/investigation/lint/vocabulario-probabilidad.ts:49-57 (EXISTE, los `id` de BANDAS_DE_PROBABILIDAD)  // +
export const IDS_DE_BANDA = [
  'casi_imposible',
  'muy_poco_probable',
  'poco_probable',
  'tan_probable_como_no',
  'probable',
  'muy_probable',
  'casi_seguro',
] as const
// fuente: 9.5-01-PLAN.md:267 (PLANIFICADO, `OracionServida.seccion` = SeccionDeSalida | 'declaracion';
//   SECCIONES_DE_SALIDA EXISTE en contrato-de-salida.ts:49)  // +
export const SECCIONES_DE_ORACION = ['KNOWLEDGE', 'LIVE_DATA', 'MEMORY', 'INFERENCE', 'RECOMMENDATION', 'ACTION', 'declaracion'] as const
// fuente: 9.5-06-PLAN.md:326 (PLANIFICADO, E13-7): el `reason` del 404 de `apagada` en toda ruta NUEVA de Naira  // +
export const RAZON_NAIRA_NO_HABILITADA = 'naira_no_habilitada'

// ── El árbol de esquemas (UN solo árbol; el modo lo decide el helper `objeto`) ──────────────────────────────────────

function construirEsquemas(estricto: boolean) {
  // P2: el ÚNICO punto donde se decide si un objeto es estricto. Todo objeto del árbol pasa por aquí.
  function objeto<S extends z.ZodRawShape>(forma: S): z.ZodObject<S> {
    return estricto ? z.object(forma).strict() : z.object(forma)
  }
  // P3: el ÚNICO objeto que deja pasar claves desconocidas, en los dos modos (ver NODOS_OPACOS_DE_NAIRA).
  function nodoOpaco<U extends string, K extends Readonly<[U, ...U[]]>>(kinds: K) {
    return z.object({ kind: z.enum(kinds) }).passthrough()
  }
  // P17: un campo enmendado por el agente (D13-23) es opcional en el tolerante y requerido en el estricto.
  function enmendado<T extends z.ZodTypeAny>(esquema: T): T | z.ZodOptional<T> {
    return estricto ? esquema : esquema.optional()
  }

  // ── Memoria (Fase 8, EXISTE) ──

  // fuente: src/server/routes/naira-memory.ts:84-86 (NairaMemoryWrittenBy)
  // estado: EXISTE
  const NairaMemoryWrittenBy = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('user'), userId: z.string() }),
    objeto({ kind: z.literal('system') }),
  ])
  // fuente: src/server/routes/naira-memory.ts:88-95 (NairaMemoryDerivedFrom)
  // estado: EXISTE
  const NairaMemoryDerivedFrom = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('fact'), source: z.string(), ref: z.string() }),
    objeto({ kind: z.literal('memory'), itemId: z.string() }),
    objeto({ kind: z.literal('human_statement') }),
    objeto({ kind: z.literal('deterministic_query'), queryId: z.string() }),
  ])
  // fuente: src/server/routes/naira-memory.ts:97-102 (NairaMemoryContent)
  // estado: EXISTE
  const NairaMemoryContent = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('present'), text: z.string() }),
    objeto({ kind: z.literal('erased'), erasedAt: z.string(), erasedBy: NairaMemoryWrittenBy }),
  ])
  // fuente: src/server/routes/naira-memory.ts:118-120 (NairaMemorySnapshot)
  // estado: EXISTE
  const NairaMemorySnapshot = objeto({ revision: z.string() })
  // fuente: src/server/routes/naira-memory.ts:104-116
  // estado: EXISTE
  const NairaMemoryItem = objeto({
    id: z.string(),
    layer: z.enum(PERSISTED_MEMORY_LAYERS),
    provenance: z.enum(PROVENANCE_KINDS),
    trust: z.enum(TRUST_LEVELS),
    writtenBy: NairaMemoryWrittenBy,
    derivedFrom: NairaMemoryDerivedFrom,
    recordedAt: z.string(),
    revision: z.string(), // bigint como string decimal: jamás Number()
    content: NairaMemoryContent,
  })
  // fuente: src/server/routes/naira-memory.ts:122-129
  // estado: EXISTE
  const NairaMemoryProposal = objeto({
    id: z.string(),
    proposedBy: objeto({ kind: z.literal('user'), userId: z.string() }),
    proposedAt: z.string(),
    text: z.string(),
  })
  // fuente: src/server/routes/naira-memory.ts:131-133
  // estado: EXISTE
  const NairaMemoryView = objeto({
    snapshot: NairaMemorySnapshot,
    items: z.array(NairaMemoryItem),
    pendingProposals: z.array(NairaMemoryProposal),
    generatedAt: z.string(),
  })
  // fuente: src/server/routes/naira-memory.ts:141 (y la promoción de 11-07-PLAN.md:401 devuelve lo mismo)
  // estado: EXISTE
  const NairaMemoryWriteResult = objeto({ item: NairaMemoryItem, snapshot: NairaMemorySnapshot })
  // fuente: src/server/routes/naira-memory.ts:143-145
  // estado: EXISTE
  const NairaMemoryErasureResult = objeto({ erasedItemIds: z.array(z.string()), erasedAt: z.string(), auditId: z.string() })
  // fuente: src/server/routes/naira-memory.ts:153-158
  // estado: EXISTE
  const NairaMemoryResolutionResult = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('confirmed'), item: NairaMemoryItem, snapshot: NairaMemorySnapshot }),
    objeto({ kind: z.literal('rejected'), proposalId: z.string() }),
  ])
  // fuente: src/server/routes/naira-memory.ts:160-162 (NairaMemoryError; `reason` opcional por agency-role.ts:233)
  // estado: EXISTE
  const NairaError = objeto({ error: z.string(), reason: z.string().nullable().optional() })
  // fuente: src/server/routes/naira-memory.ts:135 (NairaMemoryTextRequest)
  // estado: EXISTE
  const NairaMemoryCorrectionRequest = objeto({ text: z.string().min(1).max(4000) })
  // fuente: src/server/routes/naira-memory.ts:137
  // estado: EXISTE
  const NairaMemoryErasureRequest = objeto({ motivo: z.enum(ERASURE_REASONS) })
  // fuente: src/server/routes/naira-memory.ts:139
  // estado: EXISTE
  const NairaMemoryResolutionRequest = objeto({ decision: z.enum(PROPOSAL_DECISIONS) })

  // ── Conversación (9.5-06, PLANIFICADO) ──

  // fuente: 9.5-06-PLAN.md:341 (E13-4) y 9.5-01-PLAN.md:267 («OracionServida»)
  // estado: PLANIFICADO
  const NairaConversationSentence = objeto({
    seccion: z.enum(SECCIONES_DE_ORACION),
    texto: z.string(),
    claimClass: z.enum(CLAIM_CLASSES).nullable(),
    cifras: z.array(objeto({ metricId: z.string(), asOf: z.string() })),
  })
  // fuente: 9.5-06-PLAN.md:341 (E13-4) y 9.5-01-PLAN.md:267 («RefServida»)
  // estado: PLANIFICADO
  const NairaConversationRef = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('chunk'), source: z.string(), sourceRef: z.string() }),
    objeto({ kind: z.literal('investigacion'), id: z.string() }),
  ])
  // fuente: 9.5-06-PLAN.md:345 (NairaConversationScope)
  // estado: PLANIFICADO
  const NairaConversationScope = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('toda_la_agencia') }),
    objeto({ kind: z.literal('por_eje'), eje: z.enum(DIMENSIONS) }),
  ])
  // fuente: 9.5-06-PLAN.md:346 (NairaConversationCanAnswer)
  // estado: PLANIFICADO
  const NairaConversationCanAnswer = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('metrica'), metricId: z.string(), nombre: z.string() }),
    objeto({ kind: z.literal('politicas') }),
    objeto({ kind: z.literal('ficha_por_direccion_o_referencia') }),
  ])
  // fuente: 9.5-06-PLAN.md:339-344
  // estado: PLANIFICADO
  const NairaConversationAnswer = z.discriminatedUnion('kind', [
    objeto({
      kind: z.literal('respondida'),
      preguntaId: z.string(),
      texto: z.string(),
      refsServidas: z.array(z.string()),
      asOfs: z.array(z.string()),
      alcance: NairaConversationScope,
      noServidos: z.array(z.enum(CARRILES_NO_SERVIDOS)),
      oraciones: enmendado(z.array(NairaConversationSentence)),
      refs: enmendado(z.array(NairaConversationRef)),
    }),
    objeto({
      kind: z.literal('negada'),
      preguntaId: z.string(),
      razon: z.enum(RAZONES_DE_NEGATIVA),
      puedoResponder: z.array(NairaConversationCanAnswer),
      texto: z.string(),
    }),
    objeto({ kind: z.literal('bloqueada'), preguntaId: z.string(), motivo: z.enum(MOTIVOS_DE_BLOQUEO), texto: z.string() }),
    objeto({ kind: z.literal('fallida'), preguntaId: z.string(), razon: z.enum(RAZONES_DE_FALLA), texto: z.string() }),
  ])
  // fuente: 9.5-06-PLAN.md:338 (ROUTER_QUESTION_MAX_CHARS = 2000, 07-01-PLAN.md:286)
  // estado: PLANIFICADO
  const NairaConversationQuestionRequest = objeto({ question: z.string().min(1).max(2000) })

  // ── Briefing, señal y recall (10-06, PLANIFICADO) ──

  // fuente: 10-06-PLAN.md:333 (los 14 campos de ItemCongelado, 10-CONTEXT.md:260-264 con E13-2; + E13-13)
  // estado: PLANIFICADO
  const NairaBriefingItem = objeto({
    seccion: z.enum(SECCIONES_DEL_BRIEFING),
    posicion: z.number(),
    metricId: z.string(),
    valor: z.string(), // decimal como string: su validez la decide formato.ts por cifra (D13-8)
    unidad: z.enum(METRIC_UNITS),
    asOf: z.string(),
    fuente: z.string(),
    trust: z.enum(TRUST_LEVELS),
    clave: z.string(),
    urgencyClass: z.enum(URGENCY_CLASSES),
    titulo: z.string(),
    promocion: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('promovida'), promocionId: z.string() }),
      objeto({ kind: z.literal('sin_promocion') }),
    ]),
    causa: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('investigada'), razon: z.string() }),
      objeto({ kind: z.literal('investigacion_no_disponible') }),
    ]),
    entidades: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('agregada') }),
      objeto({ kind: z.literal('lista'), items: z.array(objeto({ tipo: z.string(), id: z.string() })).min(1) }),
    ]),
    valorRenderizado: enmendado(z.string()),
    nombreDeMetrica: enmendado(z.string()),
  })
  // fuente: 10-06-PLAN.md:333-334
  // estado: PLANIFICADO
  const NairaBriefingDelivery = objeto({
    canal: z.enum(CANALES_DE_ENTREGA),
    tipo: z.enum(TIPOS_DE_ENTREGA),
    congeladaEn: z.string(),
    estadoDelEnvio: z.enum(ESTADOS_DEL_ENVIO),
    items: z.array(NairaBriefingItem),
  })
  // fuente: 10-06-PLAN.md:334-335
  // estado: PLANIFICADO
  const NairaBriefingDay = objeto({
    dia: z.string(),
    corte: z.string(),
    resultado: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('entregado'), entregas: z.array(NairaBriefingDelivery), ocultosPorRol: z.number() }),
      objeto({ kind: z.literal('sin_entrega'), razon: z.enum(RAZONES_SIN_BRIEFING) }),
    ]),
  })
  // Pick de Hipotesis (contrato-de-salida.ts:161-167, EXISTE); `entidad` = EntityRef (detect/types.ts:75-78, EXISTE): nunca se pinta, B-5.
  // fuente: 10-06-PLAN.md:336 (E13-3; mismo orden y largo que `citas`) y 9.5-04-PLAN.md:324
  // estado: PLANIFICADO
  const NairaSignalCitation = objeto({
    texto: z.string(),
    claimClass: z.enum(CLAIM_CLASSES).nullable(),
    hipotesis: objeto({
      banda: z.enum(IDS_DE_BANDA),
      alternativa: z.discriminatedUnion('kind', [
        objeto({ kind: z.literal('driver'), entidad: objeto({ kind: z.string(), id: z.string() }) }),
        objeto({ kind: z.literal('sin_driver_alternativo_en_la_descomposicion') }),
      ]),
      discriminador: objeto({ metricId: z.string(), direccionEsperada: z.enum(['sube', 'baja']) }),
    }).nullable(),
  })
  // fuente: 10-06-PLAN.md:335-336
  // estado: PLANIFICADO
  const NairaSignalDetail = objeto({
    promocionId: z.string(),
    dia: z.string(),
    corte: z.string(),
    congeladaEn: z.string(),
    item: NairaBriefingItem,
    causa: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('investigacion_no_disponible') }),
      objeto({
        kind: z.literal('citada'),
        investigacionId: z.string(),
        citas: z.array(z.string()),
        citasConClase: enmendado(z.array(NairaSignalCitation)),
      }),
      objeto({ kind: z.literal('no_citable'), razon: z.enum(RAZONES_DE_CAUSA_NO_CITABLE) }),
    ]),
  })
  // fuente: 10-06-PLAN.md:619 (LARGO_MAXIMO_DE_RECALL = 2000, 10-06-PLAN.md:281)
  // estado: PLANIFICADO
  const NairaRecallRequest = objeto({ semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), texto: z.string().min(1).max(2000) })
  // fuente: 10-06-PLAN.md:619 (201)
  // estado: PLANIFICADO
  const NairaRecallResult = objeto({ respuestaId: z.string() })

  // ── Seguimiento y voto (11-07, PLANIFICADO) ──

  // fuente: 11-07-PLAN.md:380-383 (nextCheckAt)
  // estado: PLANIFICADO
  const NairaOpenLoopNextCheck = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('programada'), en: z.string() }),
    objeto({ kind: z.literal('ninguna') }),
  ])
  // fuente: 11-07-PLAN.md:380-383 y 11-03-PLAN.md (CandidatoDelLoop: el desenlace candidato nunca es 'expirado')
  // estado: PLANIFICADO
  const NairaOpenLoopCandidate = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('ninguno') }),
    objeto({
      kind: z.literal('en_curso'),
      desenlace: z.enum(DESENLACES_DEL_LOOP).exclude(['expirado']),
      confirmaciones: z.number(),
      desde: z.string(),
    }),
  ])
  // fuente: 11-07-PLAN.md:383 (comunicacion)
  // estado: PLANIFICADO
  const NairaOpenLoopCommunication = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('comunicado'), primerDia: z.string() }),
    objeto({ kind: z.literal('sin_comunicar') }),
  ])
  // fuente: 11-07-PLAN.md:380-383
  // estado: PLANIFICADO
  const NairaOpenLoop = objeto({
    loopId: z.string(),
    detectorId: z.string(),
    metricId: z.string(),
    clase: z.enum(CLASES_DE_DETECTOR),
    familia: z.enum(DOMAIN_ROLES),
    episodio: z.string(),
    claveDeCausa: z.string(),
    promocionId: z.string(),
    owner: z.enum(DUENOS_DE_ROL),
    ownerRazon: z.enum(RAZONES_DE_DUENO_DE_LOOP),
    estado: z.enum(ESTADOS_DEL_LOOP),
    ciclos: z.number(),
    forma: z.enum(FORMAS_DEL_LOOP),
    nextCheckAt: NairaOpenLoopNextCheck,
    candidato: NairaOpenLoopCandidate,
    huerfanoDeRol: z.boolean(),
    ultimoDiaVerificado: z.string(),
    abiertoEn: z.string(),
    expiraEn: z.string(),
    comunicacion: NairaOpenLoopCommunication,
  })
  // fuente: 11-07-PLAN.md:384
  // estado: PLANIFICADO
  const NairaOpenLoopsList = objeto({ generadoEn: z.string(), loops: z.array(NairaOpenLoop), ocultosPorRol: z.number() })
  // fuente: 11-03-PLAN.md:423-425 (EventoLeido campo por campo; memoria :400 y verificacion :399 como nodos opacos, P3)
  // estado: PLANIFICADO
  const NairaOpenLoopEvent = objeto({
    tipo: z.enum(TIPOS_DE_EVENTO_DEL_LOOP),
    seguimiento: objeto({
      estado: z.enum(ESTADOS_DEL_LOOP),
      ciclos: z.number(),
      forma: z.enum(FORMAS_DEL_LOOP),
      nextCheckAt: NairaOpenLoopNextCheck,
      candidato: NairaOpenLoopCandidate,
      rachaSinReincidencia: z.number(),
      ultimoDiaVerificado: z.string(),
    }),
    cambioDeForma: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('sin_cambio') }),
      objeto({ kind: z.literal('cambio'), de: z.enum(FORMAS_DEL_LOOP), a: z.enum(FORMAS_DEL_LOOP) }),
    ]),
    memoria: nodoOpaco(KINDS_DE_MEMORIA_DEL_EVENTO),
    owner: z.enum(DUENOS_DE_ROL),
    ownerRazon: z.enum(RAZONES_DE_DUENO_DE_LOOP),
    cambioDeDueno: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('sin_cambio') }),
      objeto({
        kind: z.literal('reasignado'),
        anterior: z.enum(DUENOS_DE_ROL),
        nuevo: z.enum(DUENOS_DE_ROL),
        razon: z.literal('resolvedor_cambio'),
      }),
      objeto({ kind: z.literal('revalidacion_rechazada'), razon: z.string() }),
    ]),
    huerfanoDeRol: z.boolean(),
    verificacion: nodoOpaco(KINDS_DE_VERIFICACION_DEL_EVENTO),
    corte: z.string(),
    recordedAt: z.string(),
  })
  // fuente: 11-07-PLAN.md:385-386 (la identidad = la de NairaOpenLoop, P9)
  // estado: PLANIFICADO
  const NairaOpenLoopDetail = objeto({
    loop: objeto({
      loopId: z.string(),
      detectorId: z.string(),
      metricId: z.string(),
      clase: z.enum(CLASES_DE_DETECTOR),
      familia: z.enum(DOMAIN_ROLES),
      episodio: z.string(),
      claveDeCausa: z.string(),
      promocionId: z.string(),
      abiertoEn: z.string(),
      expiraEn: z.string(),
      ownerAlNacer: z.enum(DUENOS_DE_ROL),
      owner: z.enum(DUENOS_DE_ROL),
      ownerRazon: z.enum(RAZONES_DE_DUENO_DE_LOOP),
      huerfanoDeRol: z.boolean(),
      cierre: z.discriminatedUnion('kind', [
        objeto({ kind: z.literal('abierto') }),
        objeto({ kind: z.literal('cerrado'), en: z.string(), desenlace: z.enum(DESENLACES_DEL_LOOP) }),
      ]),
      comunicacion: NairaOpenLoopCommunication,
    }),
    eventos: z.array(NairaOpenLoopEvent),
  })
  // fuente: 11-07-PLAN.md:387
  // estado: PLANIFICADO
  const NairaSignalFeedbackRequest = objeto({ valor: z.enum(VALORES_DE_FEEDBACK) })
  // fuente: 11-07-PLAN.md:387 (201)
  // estado: PLANIFICADO
  const NairaSignalFeedbackResult = objeto({
    kind: z.literal('registrado'),
    votoId: z.string(),
    valor: z.enum(VALORES_DE_FEEDBACK),
    diaDelVoto: z.string(),
  })

  // P2 (Nico, 15-10-2026): el consentimiento de WhatsApp del briefing, siempre de quien llama.
  // estado: EXISTE (micro naira-whatsapp-consentimiento.ts)
  // #13 (Nico, 15-10-2026: «cualquier pregunta, con un código»): hasta cuándo está verificado su WhatsApp y si tiene celular.
  const NairaWhatsappConsent = objeto({
    otorgado: z.boolean(),
    texto: z.string(),
    version: z.string(),
    verificadoHasta: enmendado(z.string().nullable()),
    telefonoRegistrado: enmendado(z.boolean()),
  })
  // #13: el código de seis dígitos para escribírselo a Naira por WhatsApp (se muestra una sola vez).
  // estado: EXISTE (micro naira-whatsapp-consentimiento.ts)
  const NairaWhatsappCode = objeto({ codigo: z.string().regex(/^[0-9]{6}$/), venceEn: z.string(), minutos: z.number().int() })

  // ── Acciones y tareas (12-07, PLANIFICADO) ──

  // fuente: 12-07-PLAN.md:390 (Destinatario; `evento` de vertical se mide al ejecutar 12-01: z.string(), P9)
  // estado: PLANIFICADO
  const NairaActionRecipient = z.discriminatedUnion('kind', [
    objeto({ kind: z.literal('rol'), rol: z.enum(DUENOS_DE_ROL) }),
    objeto({ kind: z.literal('vertical'), evento: z.string() }),
  ])
  // fuente: src/lib/automated-decisions/write.ts:139-154 (FactSnapshot; `value` REQUERIDO, `confidence` nunca se pinta)
  // estado: EXISTE
  const NairaFactSnapshot = objeto({
    factId: z.string().optional(),
    value: z.custom<unknown>((v) => v !== undefined),
    source: z.string(),
    asOf: z.string(),
    confidence: z.number(),
    volatility: z.string(),
    trust: z.string(),
  })
  // fuente: 12-07-PLAN.md:413-417 (AccionListada; asOfs por E13-6, :414 y :433)
  // estado: PLANIFICADO
  const NairaActionSummary = objeto({
    proposalId: z.string(),
    consecuencia: z.discriminatedUnion('kind', [
      objeto({ kind: z.literal('reproducible'), texto: z.string() }),
      objeto({ kind: z.literal('no_reproducible') }),
    ]),
    tipo: z.enum(TIPOS_DE_ACCION),
    clase: z.enum(CLASES_DE_CONSECUENCIA),
    destinatario: NairaActionRecipient,
    reversible: z.boolean(),
    estado: z.enum(ESTADOS_DE_LA_PROPUESTA),
    venceEn: z.string(),
    propuestaEn: z.string(),
    puedeDecidir: z.boolean(),
    asOfs: enmendado(z.array(z.string())),
  })
  // fuente: 12-07-PLAN.md:433
  // estado: PLANIFICADO
  const NairaActionsList = objeto({
    generadoEn: z.string(),
    desde: z.string(),
    acciones: z.array(NairaActionSummary),
    ocultasPorRol: z.number(),
  })
  // fuente: 12-07-PLAN.md:395-399 (DetalleDeAccion, consecuencia PRIMERO) y :433-434 (E2: estado y puedeDecidir)
  // estado: PLANIFICADO
  const NairaActionDetail = objeto({
    consecuencia: objeto({
      texto: z.string(),
      tipo: z.enum(TIPOS_DE_ACCION),
      clase: z.enum(CLASES_DE_CONSECUENCIA),
      destinatario: NairaActionRecipient,
      reversible: z.boolean(),
      venceEn: z.string(),
    }),
    razonamiento: objeto({
      senal: objeto({ senalId: z.string(), promocionId: z.string(), detectorId: z.string(), metricId: z.string() }),
      hechos: z.array(NairaFactSnapshot).min(1),
      investigacion: z.discriminatedUnion('kind', [
        objeto({ kind: z.literal('referencia'), id: z.string() }),
        objeto({ kind: z.literal('sin_investigacion') }),
      ]),
    }),
    huella: z.string(),
    estado: z.enum(ESTADOS_DE_LA_PROPUESTA),
    puedeDecidir: z.boolean(),
  })
  // fuente: 12-07-PLAN.md:434 (el agente lo valida .strict())
  // estado: PLANIFICADO
  const NairaActionDecisionRequest = objeto({ decision: z.enum(['aprobar', 'rechazar']), huellaVista: z.string().min(1) })
  // fuente: 12-07-PLAN.md:435
  // estado: PLANIFICADO
  const NairaActionDecisionResult = objeto({
    kind: z.literal('decidida'),
    proposalId: z.string(),
    decision: z.enum(['aprobada', 'rechazada']),
    decisionId: z.string(),
  })
  // fuente: 12-07-PLAN.md:419-420 (TareaVisible)
  // estado: PLANIFICADO
  const NairaTask = objeto({
    tareaId: z.string(),
    proposalId: z.string(),
    loopId: z.string(),
    detectorId: z.string(),
    owner: z.enum(DUENOS_DE_ROL),
    estado: z.enum(ESTADOS_DE_TAREA),
    creadaEn: z.string(),
  })
  // fuente: 12-07-PLAN.md:435
  // estado: PLANIFICADO
  const NairaTasksList = objeto({ generadoEn: z.string(), tareas: z.array(NairaTask), ocultasPorRol: z.number() })
  // fuente: 12-07-PLAN.md:436
  // estado: PLANIFICADO
  const NairaTaskCancelResult = objeto({ kind: z.literal('cancelada'), tareaId: z.string() })

  return {
    NairaError,
    NairaMemoryView,
    NairaMemoryItem,
    NairaMemoryProposal,
    NairaMemoryWriteResult,
    NairaMemoryErasureResult,
    NairaMemoryResolutionResult,
    NairaConversationAnswer,
    NairaBriefingDay,
    NairaBriefingDelivery,
    NairaBriefingItem,
    NairaSignalDetail,
    NairaRecallResult,
    NairaSignalFeedbackResult,
    NairaWhatsappConsent,
    NairaWhatsappCode,
    NairaOpenLoopsList,
    NairaOpenLoop,
    NairaOpenLoopDetail,
    NairaOpenLoopEvent,
    NairaActionsList,
    NairaActionSummary,
    NairaActionDetail,
    NairaActionDecisionResult,
    NairaTasksList,
    NairaTask,
    NairaTaskCancelResult,
    NairaConversationSentence,
    NairaConversationRef,
    NairaSignalCitation,
    NairaMemoryCorrectionRequest,
    NairaMemoryErasureRequest,
    NairaMemoryResolutionRequest,
    NairaConversationQuestionRequest,
    NairaRecallRequest,
    NairaSignalFeedbackRequest,
    NairaActionDecisionRequest,
  }
}

/** El árbol que usa la ejecución (tolerante: quita lo agregado en todos los niveles). */
const TOLERANTES = construirEsquemas(false)
/**
 * El MISMO árbol con todo objeto estricto. Para los tests (un campo inventado en cualquier nivel es rojo) y para los
 * cuerpos de pedido que ARMA el front (cliente.ts, P6). Una RESPUESTA del agente jamás se parsea con este árbol.
 */
export const ESQUEMAS_ESTRICTOS_DE_NAIRA = construirEsquemas(true)
export type EsquemasDeNaira = typeof ESQUEMAS_ESTRICTOS_DE_NAIRA // +

// ── Esquemas tolerantes exportados y sus tipos ──────────────────────────────────────────────────────────────────────

export const NairaErrorSchema = TOLERANTES.NairaError
export type NairaError = z.infer<typeof NairaErrorSchema>
export const NairaMemoryViewSchema = TOLERANTES.NairaMemoryView
export type NairaMemoryView = z.infer<typeof NairaMemoryViewSchema>
export const NairaMemoryItemSchema = TOLERANTES.NairaMemoryItem
export type NairaMemoryItem = z.infer<typeof NairaMemoryItemSchema>
export const NairaMemoryProposalSchema = TOLERANTES.NairaMemoryProposal
export type NairaMemoryProposal = z.infer<typeof NairaMemoryProposalSchema>
export const NairaMemoryWriteResultSchema = TOLERANTES.NairaMemoryWriteResult
export type NairaMemoryWriteResult = z.infer<typeof NairaMemoryWriteResultSchema>
export const NairaMemoryErasureResultSchema = TOLERANTES.NairaMemoryErasureResult
export type NairaMemoryErasureResult = z.infer<typeof NairaMemoryErasureResultSchema>
export const NairaMemoryResolutionResultSchema = TOLERANTES.NairaMemoryResolutionResult
export type NairaMemoryResolutionResult = z.infer<typeof NairaMemoryResolutionResultSchema>
export const NairaConversationAnswerSchema = TOLERANTES.NairaConversationAnswer
export type NairaConversationAnswer = z.infer<typeof NairaConversationAnswerSchema>
export const NairaBriefingDaySchema = TOLERANTES.NairaBriefingDay
export type NairaBriefingDay = z.infer<typeof NairaBriefingDaySchema>
export const NairaBriefingDeliverySchema = TOLERANTES.NairaBriefingDelivery
export type NairaBriefingDelivery = z.infer<typeof NairaBriefingDeliverySchema>
export const NairaBriefingItemSchema = TOLERANTES.NairaBriefingItem
export type NairaBriefingItem = z.infer<typeof NairaBriefingItemSchema>
export const NairaSignalDetailSchema = TOLERANTES.NairaSignalDetail
export type NairaSignalDetail = z.infer<typeof NairaSignalDetailSchema>
export const NairaRecallResultSchema = TOLERANTES.NairaRecallResult
export type NairaRecallResult = z.infer<typeof NairaRecallResultSchema>
export const NairaSignalFeedbackResultSchema = TOLERANTES.NairaSignalFeedbackResult
export type NairaSignalFeedbackResult = z.infer<typeof NairaSignalFeedbackResultSchema>
export const NairaWhatsappConsentSchema = TOLERANTES.NairaWhatsappConsent
export type NairaWhatsappConsent = z.infer<typeof NairaWhatsappConsentSchema>
export const NairaWhatsappCodeSchema = TOLERANTES.NairaWhatsappCode
export type NairaWhatsappCode = z.infer<typeof NairaWhatsappCodeSchema>
export const NairaOpenLoopsListSchema = TOLERANTES.NairaOpenLoopsList
export type NairaOpenLoopsList = z.infer<typeof NairaOpenLoopsListSchema>
export const NairaOpenLoopSchema = TOLERANTES.NairaOpenLoop
export type NairaOpenLoop = z.infer<typeof NairaOpenLoopSchema>
export const NairaOpenLoopDetailSchema = TOLERANTES.NairaOpenLoopDetail
export type NairaOpenLoopDetail = z.infer<typeof NairaOpenLoopDetailSchema>
export const NairaOpenLoopEventSchema = TOLERANTES.NairaOpenLoopEvent
export type NairaOpenLoopEvent = z.infer<typeof NairaOpenLoopEventSchema>
export const NairaActionsListSchema = TOLERANTES.NairaActionsList
export type NairaActionsList = z.infer<typeof NairaActionsListSchema>
export const NairaActionSummarySchema = TOLERANTES.NairaActionSummary
export type NairaActionSummary = z.infer<typeof NairaActionSummarySchema>
export const NairaActionDetailSchema = TOLERANTES.NairaActionDetail
export type NairaActionDetail = z.infer<typeof NairaActionDetailSchema>
export const NairaActionDecisionResultSchema = TOLERANTES.NairaActionDecisionResult
export type NairaActionDecisionResult = z.infer<typeof NairaActionDecisionResultSchema>
export const NairaTasksListSchema = TOLERANTES.NairaTasksList
export type NairaTasksList = z.infer<typeof NairaTasksListSchema>
export const NairaTaskSchema = TOLERANTES.NairaTask
export type NairaTask = z.infer<typeof NairaTaskSchema>
export const NairaTaskCancelResultSchema = TOLERANTES.NairaTaskCancelResult
export type NairaTaskCancelResult = z.infer<typeof NairaTaskCancelResultSchema>
export const NairaConversationSentenceSchema = TOLERANTES.NairaConversationSentence
export type NairaConversationSentence = z.infer<typeof NairaConversationSentenceSchema>
export const NairaConversationRefSchema = TOLERANTES.NairaConversationRef
export type NairaConversationRef = z.infer<typeof NairaConversationRefSchema>
export const NairaSignalCitationSchema = TOLERANTES.NairaSignalCitation
export type NairaSignalCitation = z.infer<typeof NairaSignalCitationSchema>
export const NairaMemoryCorrectionRequestSchema = TOLERANTES.NairaMemoryCorrectionRequest
export type NairaMemoryCorrectionRequest = z.infer<typeof NairaMemoryCorrectionRequestSchema>
export const NairaMemoryErasureRequestSchema = TOLERANTES.NairaMemoryErasureRequest
export type NairaMemoryErasureRequest = z.infer<typeof NairaMemoryErasureRequestSchema>
export const NairaMemoryResolutionRequestSchema = TOLERANTES.NairaMemoryResolutionRequest
export type NairaMemoryResolutionRequest = z.infer<typeof NairaMemoryResolutionRequestSchema>
export const NairaConversationQuestionRequestSchema = TOLERANTES.NairaConversationQuestionRequest
export type NairaConversationQuestionRequest = z.infer<typeof NairaConversationQuestionRequestSchema>
export const NairaRecallRequestSchema = TOLERANTES.NairaRecallRequest
export type NairaRecallRequest = z.infer<typeof NairaRecallRequestSchema>
export const NairaSignalFeedbackRequestSchema = TOLERANTES.NairaSignalFeedbackRequest
export type NairaSignalFeedbackRequest = z.infer<typeof NairaSignalFeedbackRequestSchema>
export const NairaActionDecisionRequestSchema = TOLERANTES.NairaActionDecisionRequest
export type NairaActionDecisionRequest = z.infer<typeof NairaActionDecisionRequestSchema>

// ── Endpoints (la tabla del §3.1 del CONTEXT, fila por fila) ────────────────────────────────────────────────────────

export const NAIRA_BASE = '/api/agency/{agencyId}/naira'

/** Solo las acciones del módulo `naira` que consume la Fase 13. */
export const ACCIONES_DE_NAIRA = [
  'memory-view',
  'memory-correct',
  'memory-erase',
  'procedural-approve',
  'memory-promote',
  'conversation-ask',
  'briefing-view',
  'signal-view',
  'recall-answer',
  'open-loops-view',
  'signal-feedback',
  'action-view',
  'task-view',
  'action-approve-internal',
  'action-approve-external',
  'task-cancel',
  // P2 (15-10-2026): el consentimiento de WhatsApp propio vive bajo la preferencia de notificación.
  'notify-preferences-edit',
] as const
export type AccionDeNaira = (typeof ACCIONES_DE_NAIRA)[number]

export type IdDeEndpoint =
  | 'memoria.vista'
  | 'memoria.corregir'
  | 'memoria.borrar'
  | 'memoria.resolverPropuesta'
  | 'memoria.promover'
  | 'conversacion.preguntar'
  | 'briefing.dia'
  | 'senal.detalle'
  | 'recall.responder'
  | 'senal.voto'
  | 'seguimiento.lista'
  | 'seguimiento.detalle'
  | 'acciones.lista'
  | 'acciones.detalle'
  | 'acciones.decidir'
  | 'tareas.lista'
  | 'tareas.cancelar'
  | 'whatsapp.consentimiento'
  | 'whatsapp.consentir'
  | 'whatsapp.codigo'

export interface EndpointDeNaira {
  readonly id: IdDeEndpoint
  readonly metodo: 'GET' | 'POST'
  /** Relativa a NAIRA_BASE y SIN query (el `?dia=` del briefing lo arma el cliente). */
  readonly ruta: string
  readonly acciones: readonly AccionDeNaira[]
  readonly estado: 'EXISTE' | 'PLANIFICADO'
  readonly fuente: string
  /** Qué produce un 404 SIN `reason: 'naira_no_habilitada'` (heurística declarada del §3.1, D13-4). */
  readonly si404: 'apagada' | 'no_encontrado'
}

export const ENDPOINTS_DE_NAIRA: Readonly<Record<IdDeEndpoint, EndpointDeNaira>> = {
  'memoria.vista': {
    id: 'memoria.vista',
    metodo: 'GET',
    ruta: '/memory',
    acciones: ['memory-view'],
    estado: 'EXISTE',
    fuente: 'src/server/routes/naira-memory.ts:185-199',
    si404: 'apagada',
  },
  'memoria.corregir': {
    id: 'memoria.corregir',
    metodo: 'POST',
    ruta: '/memory/items/{itemId}/correction',
    acciones: ['memory-correct'],
    estado: 'EXISTE',
    fuente: 'src/server/routes/naira-memory.ts:201-214',
    si404: 'no_encontrado',
  },
  'memoria.borrar': {
    id: 'memoria.borrar',
    metodo: 'POST',
    ruta: '/memory/items/{itemId}/erasure',
    acciones: ['memory-erase'],
    estado: 'EXISTE',
    fuente: 'src/server/routes/naira-memory.ts:216-229',
    si404: 'no_encontrado',
  },
  'memoria.resolverPropuesta': {
    id: 'memoria.resolverPropuesta',
    metodo: 'POST',
    ruta: '/memory/procedural/proposals/{proposalId}/resolution',
    acciones: ['procedural-approve'],
    estado: 'EXISTE',
    fuente: 'src/server/routes/naira-memory.ts:256-269',
    si404: 'no_encontrado',
  },
  'memoria.promover': {
    id: 'memoria.promover',
    metodo: 'POST',
    ruta: '/memory/items/{itemId}/promotion',
    acciones: ['memory-promote'],
    estado: 'PLANIFICADO',
    fuente: '11-07-PLAN.md:401',
    si404: 'no_encontrado',
  },
  'conversacion.preguntar': {
    id: 'conversacion.preguntar',
    metodo: 'POST',
    ruta: '/conversation/questions',
    acciones: ['conversation-ask'],
    estado: 'PLANIFICADO',
    fuente: '9.5-06-PLAN.md:336-347',
    si404: 'apagada',
  },
  'briefing.dia': {
    id: 'briefing.dia',
    metodo: 'GET',
    ruta: '/briefing',
    acciones: ['briefing-view'],
    estado: 'PLANIFICADO',
    fuente: '10-06-PLAN.md:329',
    si404: 'apagada',
  },
  'senal.detalle': {
    id: 'senal.detalle',
    metodo: 'GET',
    ruta: '/signals/{promocionId}',
    acciones: ['signal-view'],
    estado: 'PLANIFICADO',
    fuente: '10-06-PLAN.md:330',
    si404: 'no_encontrado',
  },
  'recall.responder': {
    id: 'recall.responder',
    metodo: 'POST',
    ruta: '/recall',
    acciones: ['recall-answer'],
    estado: 'PLANIFICADO',
    fuente: '10-06-PLAN.md:348,619',
    si404: 'apagada',
  },
  'whatsapp.consentimiento': {
    id: 'whatsapp.consentimiento',
    metodo: 'GET',
    ruta: '/whatsapp-consent',
    acciones: ['notify-preferences-edit'],
    estado: 'EXISTE',
    fuente: 'P2 (Nico, 15-10-2026) — micro naira-whatsapp-consentimiento.ts',
    si404: 'apagada',
  },
  'whatsapp.consentir': {
    id: 'whatsapp.consentir',
    metodo: 'POST',
    ruta: '/whatsapp-consent',
    acciones: ['notify-preferences-edit'],
    estado: 'EXISTE',
    fuente: 'P2 (Nico, 15-10-2026) — micro naira-whatsapp-consentimiento.ts',
    si404: 'apagada',
  },
  'whatsapp.codigo': {
    id: 'whatsapp.codigo',
    metodo: 'POST',
    ruta: '/whatsapp-code',
    acciones: ['notify-preferences-edit'],
    estado: 'EXISTE',
    fuente: '#13 (Nico, 15-10-2026) — micro naira-whatsapp-consentimiento.ts',
    si404: 'apagada',
  },
  'senal.voto': {
    id: 'senal.voto',
    metodo: 'POST',
    ruta: '/signals/{promocionId}/feedback',
    acciones: ['signal-feedback'],
    estado: 'PLANIFICADO',
    fuente: '11-07-PLAN.md:378',
    si404: 'no_encontrado',
  },
  'seguimiento.lista': {
    id: 'seguimiento.lista',
    metodo: 'GET',
    ruta: '/open-loops',
    acciones: ['open-loops-view'],
    estado: 'PLANIFICADO',
    fuente: '11-07-PLAN.md:376',
    si404: 'apagada',
  },
  'seguimiento.detalle': {
    id: 'seguimiento.detalle',
    metodo: 'GET',
    ruta: '/open-loops/{loopId}',
    acciones: ['open-loops-view'],
    estado: 'PLANIFICADO',
    fuente: '11-07-PLAN.md:377',
    si404: 'no_encontrado',
  },
  'acciones.lista': {
    id: 'acciones.lista',
    metodo: 'GET',
    ruta: '/actions',
    acciones: ['action-view'],
    estado: 'PLANIFICADO',
    fuente: '12-07-PLAN.md:427',
    si404: 'apagada',
  },
  'acciones.detalle': {
    id: 'acciones.detalle',
    metodo: 'GET',
    ruta: '/actions/{proposalId}',
    acciones: ['action-view'],
    estado: 'PLANIFICADO',
    fuente: '12-07-PLAN.md:428',
    si404: 'no_encontrado',
  },
  'acciones.decidir': {
    id: 'acciones.decidir',
    metodo: 'POST',
    ruta: '/actions/{proposalId}/decision',
    acciones: ['action-approve-internal', 'action-approve-external'],
    estado: 'PLANIFICADO',
    fuente: '12-07-PLAN.md:429',
    si404: 'no_encontrado',
  },
  'tareas.lista': {
    id: 'tareas.lista',
    metodo: 'GET',
    ruta: '/tasks',
    acciones: ['task-view'],
    estado: 'PLANIFICADO',
    fuente: '12-07-PLAN.md:430',
    si404: 'apagada',
  },
  'tareas.cancelar': {
    id: 'tareas.cancelar',
    metodo: 'POST',
    ruta: '/tasks/{tareaId}/cancel',
    acciones: ['task-cancel'],
    estado: 'PLANIFICADO',
    fuente: '12-07-PLAN.md:431',
    si404: 'no_encontrado',
  },
}

/** Los 17 ids en el orden del §3.1. */ // +
export const IDS_DE_ENDPOINT: readonly IdDeEndpoint[] = [
  'memoria.vista',
  'memoria.corregir',
  'memoria.borrar',
  'memoria.resolverPropuesta',
  'memoria.promover',
  'conversacion.preguntar',
  'briefing.dia',
  'senal.detalle',
  'recall.responder',
  'senal.voto',
  'seguimiento.lista',
  'seguimiento.detalle',
  'acciones.lista',
  'acciones.detalle',
  'acciones.decidir',
  'tareas.lista',
  'tareas.cancelar',
  'whatsapp.consentimiento',
  'whatsapp.consentir',
  'whatsapp.codigo',
]

// ── Respuesta de cada endpoint ──────────────────────────────────────────────────────────────────────────────────────

export type RespuestasDeNaira = {
  readonly 'memoria.vista': NairaMemoryView
  readonly 'memoria.corregir': NairaMemoryWriteResult
  readonly 'memoria.borrar': NairaMemoryErasureResult
  readonly 'memoria.resolverPropuesta': NairaMemoryResolutionResult
  readonly 'memoria.promover': NairaMemoryWriteResult
  readonly 'conversacion.preguntar': NairaConversationAnswer
  readonly 'briefing.dia': NairaBriefingDay
  readonly 'senal.detalle': NairaSignalDetail
  readonly 'recall.responder': NairaRecallResult
  readonly 'senal.voto': NairaSignalFeedbackResult
  readonly 'whatsapp.consentimiento': NairaWhatsappConsent
  readonly 'whatsapp.consentir': NairaWhatsappConsent
  readonly 'whatsapp.codigo': NairaWhatsappCode
  readonly 'seguimiento.lista': NairaOpenLoopsList
  readonly 'seguimiento.detalle': NairaOpenLoopDetail
  readonly 'acciones.lista': NairaActionsList
  readonly 'acciones.detalle': NairaActionDetail
  readonly 'acciones.decidir': NairaActionDecisionResult
  readonly 'tareas.lista': NairaTasksList
  readonly 'tareas.cancelar': NairaTaskCancelResult
}

type RespuestaPorEndpoint = { readonly [K in IdDeEndpoint]: z.ZodType<RespuestasDeNaira[K], z.ZodTypeDef, unknown> }

/** El mapa id → esquema de respuesta (memoria.corregir y memoria.promover ⇒ NairaMemoryWriteResult). */
function respuestaPorEndpoint(e: EsquemasDeNaira): RespuestaPorEndpoint {
  return {
    'memoria.vista': e.NairaMemoryView,
    'memoria.corregir': e.NairaMemoryWriteResult,
    'memoria.borrar': e.NairaMemoryErasureResult,
    'memoria.resolverPropuesta': e.NairaMemoryResolutionResult,
    'memoria.promover': e.NairaMemoryWriteResult,
    'conversacion.preguntar': e.NairaConversationAnswer,
    'briefing.dia': e.NairaBriefingDay,
    'senal.detalle': e.NairaSignalDetail,
    'recall.responder': e.NairaRecallResult,
    'senal.voto': e.NairaSignalFeedbackResult,
    'whatsapp.consentimiento': e.NairaWhatsappConsent,
    'whatsapp.consentir': e.NairaWhatsappConsent,
    'whatsapp.codigo': e.NairaWhatsappCode,
    'seguimiento.lista': e.NairaOpenLoopsList,
    'seguimiento.detalle': e.NairaOpenLoopDetail,
    'acciones.lista': e.NairaActionsList,
    'acciones.detalle': e.NairaActionDetail,
    'acciones.decidir': e.NairaActionDecisionResult,
    'tareas.lista': e.NairaTasksList,
    'tareas.cancelar': e.NairaTaskCancelResult,
  }
}

/** Ejecución: lo que el cliente usa para parsear cada respuesta (todo o nada). */
export const RESPUESTA_TOLERANTE_POR_ENDPOINT: RespuestaPorEndpoint = respuestaPorEndpoint(TOLERANTES)
/** Tests: el mismo mapa con el árbol estricto en todos los niveles. */
export const RESPUESTA_ESTRICTA_POR_ENDPOINT: RespuestaPorEndpoint = respuestaPorEndpoint(ESQUEMAS_ESTRICTOS_DE_NAIRA)

/** Los únicos objetos que dejan pasar claves desconocidas (P3). */
export const NODOS_OPACOS_DE_NAIRA = ['NairaOpenLoopEvent.memoria', 'NairaOpenLoopEvent.verificacion'] as const
