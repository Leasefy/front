/**
 * Beta Chat type definitions.
 *
 * Core message and conversation types for the Leasefy AI Beta chat interface.
 * Used by useBetaChat hook and all chat UI components.
 */

// ============================================================================
// Enums / Unions
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'complete' | 'error';

/**
 * Agent types. The first four are the REAL dispatchable agent roster (the
 * backend `dispatches[].agent`); the rest are legacy categories kept for
 * existing mock/widget consumers. (AI CHAT HOME F4 — aligned with the roster.)
 */
export type AgentType =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'avaluo'
  | 'conciliacion'
  | 'pagos'
  | 'pipeline'
  | 'mantenimiento'
  | 'documentos'
  | 'comunicacion'
  | 'reportes';

export type AgentExecutionStatus = 'dispatching' | 'running' | 'completed' | 'failed';

/** Decision recommendation level for each option */
export type DecisionRecommendation = 'recommended' | 'neutral' | 'not_recommended';

// ============================================================================
// Decision Types
// ============================================================================

/** A single option within a pending decision */
export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  recommendation: DecisionRecommendation;
}

/** A decision card embedded in the conversation */
export interface PendingDecision {
  id: string;
  title: string;
  description: string;
  options: DecisionOption[];
  /** Set when user selects an option */
  selectedOptionId?: string;
  /** Timestamp when user made the selection */
  selectedAt?: Date;
  /** Which agent category this decision relates to */
  category: AgentType;
  /**
   * Set when this decision is a BACKEND binding-action approval (the chat
   * proposed an action it must not auto-execute). Carries the backend approval
   * id so resolving an option relays the operator's decision to the agent via
   * POST /ai-hub/chat/approvals/:approvalId/resolve. Absent for local/mock
   * decisions, which keep their existing follow-up behavior.
   */
  approvalId?: string;
}

// ============================================================================
// Core Types
// ============================================================================

export interface AgentExecution {
  id: string;
  agentType: AgentType;
  /** Brief description of what the agent is doing */
  taskDescription: string;
  status: AgentExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  /** Duration in ms (for display) */
  durationMs?: number;
  /** Error message if status === 'failed' */
  error?: string;
}

/** An agent activity block in the conversation */
export interface AgentActivityBlock {
  id: string;
  /** Which message this activity belongs to (the assistant response) */
  messageId: string;
  agents: AgentExecution[];
  startedAt: Date;
}

// ── Pasos del turno (lo que se ve en «Progreso de la tarea») ────────────────

export type TurnStepStatus = 'pending' | 'running' | 'done' | 'failed';

/**
 * Un paso REAL del turno en curso.
 *
 * Nico, 2026-08-27: «dejaste solo como 3 tareas siempre y ya, nada
 * inteligente; quiero que muestre según el contexto las diferentes tareas».
 *
 * El plan no se inventa ni se adivina de la pregunta: se ARMA con los eventos
 * que manda el backend en el mismo turno (`snapshot`, `dispatch_start`,
 * `dispatch_result`, `action_proposal`), así que cambia según lo que el
 * asistente de verdad hace. Preguntar por la cartera y pedir una cotización
 * producen planes distintos porque despachan agentes distintos.
 *
 * `label` es texto del backend (la tarea tal cual la escribió el orquestador,
 * intraducible); `labelKey` es para las fases fijas, que sí se traducen.
 */
export interface TurnStep {
  id: string;
  kind: 'entender' | 'cartera' | 'agente' | 'herramienta' | 'propuesta' | 'redactar';
  /** Texto real del backend. Gana sobre `labelKey` cuando está. */
  label?: string;
  /** Clave i18n de una fase fija del turno. */
  labelKey?: string;
  /** Sub-línea con contenido real (el resumen que devolvió el agente). */
  detail?: string;
  /** Sub-línea traducible, con variables (las cifras del snapshot). */
  detailKey?: string;
  detailVars?: Record<string, string | number>;
  agentType?: AgentType;
  /**
   * Cuántas veces seguidas ocurrió el MISMO paso. El especialista vuelve a
   * llamar a una herramienta con otros parámetros (visto en vivo: calculó el
   * plan de cuotas dos veces); seis filas con repetidos se leen como ruido, y
   * borrar las repeticiones sería mentir por omisión. Se cuentan.
   */
  repeticiones?: number;
  /**
   * Lo que el paso está haciendo AHORA, en presente («Leyendo contratos…»,
   * «Leí 29 filas de contratos»). Llega por el evento `progreso` del micro y
   * se reemplaza con cada aviso. Nico (23-09): «se queda ahí sólo con un texto
   * y sin cargas, no se sabe si sí está funcionando».
   */
  actividad?: string;
  /** Sub-avance medible del paso activo (llega con `progreso` cuando hay total). */
  avance?: { hechos: number; total: number };
  status: TurnStepStatus;
  startedAt?: Date;
  completedAt?: Date;
}

/** Type of response for display routing */
export type ResponseType = 'informative' | 'actionable';

/** An action button shown on response cards */
export interface ResponseAction {
  id: string;
  label: string;
  /**
   * Lo que se le pregunta al asistente al tocar la acción.
   *
   * Es el comportamiento PRINCIPAL (Nico, 2026-08-27: «todas estas acciones
   * deben verse reflejadas en el chat, porque para eso es ese chat, no para
   * que lo lleves a otro lado»). Cuando falta, se usa el `label`, que ya viene
   * redactado como una petición («Ver resumen de cobranza de hoy»).
   */
  prompt?: string;
  /**
   * Lo que pide el botón, con forma (23-09, «todo en el chat»): viaja con el
   * mensaje para que el micro lo atienda sin adivinar el texto. Ya no hay
   * `href`: ningún botón del chat saca de la conversación (Nico, 23-09).
   */
  intencion?: import('@/lib/chat/acciones-del-hilo').IntencionDelChat;
  /** Phosphor icon name */
  icon: string;
  /** Visual variant */
  variant: 'primary' | 'secondary' | 'ghost';
}

/** Metadata for structured response display */
export interface ResponseMeta {
  type: ResponseType;
  /** Card title for the response */
  title: string;
  /** Short summary shown in the card header */
  summary: string;
  /** Action buttons for the response */
  actions: ResponseAction[];
  /** Agent that primarily contributed to this response */
  primaryAgent?: AgentType;
  /** Steps for actionable workspace (left column) */
  steps?: WorkspaceStep[];
}

/** A step in an actionable workspace flow */
export interface WorkspaceStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed';
  agentType?: AgentType;
}

// ============================================================================
// Action Proposal Types (F5 — human-in-the-loop confirmations)
// ============================================================================

/** Cola types that can emit action proposals */
export type ActionProposalColaType = 'conciliacion' | 'pagos' | 'cobranza';

/** Actions per cola — closed catalog (D-42-03) */
export type ConciliacionAction = 'confirm' | 'reject';
export type PagosAction = 'approve' | 'reject';
export type CobranzaAction = 'claim' | 'resolve';
export type ActionProposalAction = ConciliacionAction | PagosAction | CobranzaAction;

/**
 * Whether an action is a "negative" one that should prompt the operator
 * for an optional reason (reject/resolve).
 */
export function isNegativeAction(action: ActionProposalAction): boolean {
  return action === 'reject' || action === 'resolve';
}

/** Status of a single action proposal card */
export type ActionProposalStatus =
  | 'pending'       // awaiting human decision
  | 'confirming'    // POST in-flight
  | 'executed'      // POST succeeded
  | 'error'         // POST failed (shows retry)
  | 'discarded';    // user dismissed without calling backend

export interface ActionProposal {
  /** Work item ID in the backend cola */
  workItemId: string;
  /** Which cola this item belongs to */
  colaType: ActionProposalColaType;
  /** The proposed action */
  action: ActionProposalAction;
  /** Human-readable summary of the work item + proposed action */
  resumen: string;
  /** Backend always sends requiresConfirmation: true — kept for forward compat */
  requiresConfirmation: true;
  // --- Front-only mutable state ---
  /** Current UI state for this proposal */
  status: ActionProposalStatus;
  /** Optional reason entered by the operator (for negative actions) */
  reason?: string;
  /** True once the backend execute call succeeded (payload not stored) */
  result?: boolean;
  /** Error message if status === 'error' */
  error?: string;
}

/**
 * "Estado de hoy" numeric snapshot the cobranza backend emits at the start of a
 * turn (SSE `snapshot` event / one-shot `snapshot` field). Rendered as a
 * `ChatDataCard` glance under the assistant reply. Mirrors the backend's numeric
 * KPIs (drops `generatedAt`, which is display-irrelevant here).
 */
export interface ChatSnapshot {
  deudoresActivos: number;
  pagadoHoyCop: number;
  llamadasHoy: number;
  escalacionesPendientes: number;
  enPrejuridico: number;
  /** La cartera del ERP (Pagos → Cartera). Falta con un micro anterior al 23-09. */
  carteraCop?: number;
  contratosEnCartera?: number;
}

/**
 * Una acción que el chat dejó PREPARADA en este mensaje y que espera el sí del
 * operador. `estado` es el estado de la tarjeta en ESTE navegador; la verdad
 * vive en el agente (la propuesta vence a los 10 minutos y su confirmación es
 * idempotente), así que la tarjeta nunca ejecuta por su cuenta: manda el id.
 */
export interface AccionEnHilo {
  propuesta: import('@/lib/api/ai-hub-acciones').BackendAccionPropuesta;
  estado: 'pendiente' | 'confirmando' | 'ejecutada' | 'fallida' | 'cancelada' | 'vencida';
  /** Lo que de verdad pasó al confirmar: cuántos salieron y quiénes no. */
  resultado?: import('@/lib/api/ai-hub-acciones').ResultadoDeAccion | null;
  /** Por qué no se pudo ni intentar (venció, la cancelaron, sin permiso). */
  error?: string | null;
}

/**
 * Por qué y qué consulta del turno falló, tal como lo dice el micro en el
 * `done`. Valores del contrato: `motivo` = 'tiempo' | 'red' | 'servidor';
 * `que` = 'busqueda' | 'cartera' | 'ficha' | 'cifras'. Se guardan como texto:
 * el botón no depende del valor, y uno nuevo del micro no debe esconderlo.
 */
export interface Reintentable {
  motivo: string;
  que: string;
}

export interface ChatMessage {
  /** Unique identifier (crypto.randomUUID or fallback) */
  id: string;
  /** Who sent this message */
  role: MessageRole;
  /** Message text content (plain text for now, markdown in 18-02) */
  content: string;
  /** When the message was created */
  timestamp: Date;
  /** Current delivery/processing status */
  status: MessageStatus;
  /** Agent executions associated with this assistant response */
  agentActivity?: AgentActivityBlock;
  /** Pending decision attached to this assistant response */
  decision?: PendingDecision;
  /** Acción preparada por el chat que espera confirmación (o su resultado). */
  accion?: AccionEnHilo;
  /** Structured response metadata for rich card display */
  responseMeta?: ResponseMeta;
  /** Action proposals (F5) — one or more work items awaiting human confirmation */
  actionProposals?: ActionProposal[];
  /** "Estado de hoy" KPI snapshot from the backend (rendered as a data card). */
  snapshot?: ChatSnapshot;
  /**
   * La parte de la respuesta con FORMA (tabla, cifra, aviso) y las entidades
   * de la búsqueda. Llegan en el `done`; el texto sigue siendo el respaldo.
   * Ver `src/lib/chat/bloques.ts`.
   */
  bloques?: import('@/lib/chat/bloques').BloqueDeRespuesta[];
  entidades?: import('@/lib/chat/bloques').EntidadDelChat[];
  /**
   * «Todo en el chat» (Nico, 23-09): en un mensaje de la PERSONA, lo que pidió
   * con un botón del hilo (la intención viaja con el texto). En uno del
   * asistente, lo que se puede hacer (`acciones`), la tarjeta de «¿Lo hago?»
   * (`confirmacion`), lo que pasó (`resultado`) y los datos que faltan
   * (`formulario`). Ver `src/lib/chat/acciones-del-hilo.ts`.
   */
  intencion?: import('@/lib/chat/acciones-del-hilo').IntencionDelChat;
  acciones?: import('@/lib/chat/acciones-del-hilo').AccionDelHilo[];
  confirmacion?: import('@/lib/chat/acciones-del-hilo').ConfirmacionEnElHilo;
  resultado?: import('@/lib/chat/acciones-del-hilo').ResultadoEnElHilo;
  formulario?: import('@/lib/chat/acciones-del-hilo').FormularioEnElHilo;
  /**
   * La tarjeta del EJECUTOR (24-09): propuesta, en curso, resultado (con la
   * gracia de «Deshacer» de P-10), programada o error. Con ella a la vista,
   * `confirmacion` y `resultado` (la misma ejecución, para un panel viejo) no
   * se pintan. Se pone al día con `GET …/ejecuciones/{id}` en su mismo mensaje.
   * Ver `src/lib/chat/tarjetas-de-ejecucion.ts`.
   */
  ejecucion?: import('@/lib/chat/tarjetas-de-ejecucion').TarjetaDeEjecucion;
  /**
   * (24-09, paquete H) La tarjeta del PLAN: varias acciones del registro
   * pedidas en una frase, con UNA confirmación y el avance paso a paso. Ver
   * `src/lib/chat/plan-del-chat.ts`.
   */
  plan?: import('@/lib/chat/plan-del-chat').TarjetaDePlan;
  /** El turno corrió en modo ensayo del servidor: nada se ejecutó ni se programó. */
  ensayo?: boolean;
  /**
   * El id de ESTE turno en el cerebro del micro (23-09), acuñado por el
   * servidor: llega en el `done` del stream y en la respuesta del POST. Con él
   * viajan las señales que sólo ve la pantalla (`src/lib/chat/senales.ts`) y
   * el 👍/👎, que así se asocian EXACTO al turno en vez de buscarlo por el
   * texto de la pregunta. Falta en los mensajes de antes del 23-09 y con un
   * micro viejo: entonces no sale ninguna señal.
   */
  turnoId?: string;
  /**
   * El micro NO PUDO hacer una consulta de este turno y vale la pena volver a
   * preguntar (contrato fijo con el micro, 23-09: llega en el `done`). Con él
   * la respuesta lleva un botón «Reintentar» a la vista. Sin él no se pinta
   * nada: el front no adivina fallos leyendo el texto.
   */
  reintentable?: Reintentable;
  /**
   * Valoración del usuario sobre esta respuesta (pulgar arriba/abajo).
   *
   * Se guarda en el mensaje —y por lo tanto sobrevive el localStorage, que
   * serializa el mensaje entero— para que el pulgar quede marcado al volver a
   * la conversación. Desde el 13/09 además SALE: `rateMessage` lo manda a
   * `POST /ai-hub/chat/feedback`, que lo guarda por inmobiliaria y, con
   * comentario, lo convierte en una lección que el chat usa en la siguiente
   * pregunta.
   */
  feedback?: 'up' | 'down' | null;
  /**
   * El backend confirmó la valoración. Es lo que hace que la pantalla pueda
   * decir «guardado» sin mentir: el pulgar marcado y el pulgar GUARDADO son
   * dos cosas distintas (la red puede fallar).
   */
  feedbackEnviado?: boolean;
  /** Lo que el usuario escribió en «¿qué esperabas?» (pulgar abajo). */
  feedbackComentario?: string;
  /** Marcó «la cifra está mal». */
  feedbackCifraMal?: boolean;
  /** Se creó una lección con ese comentario (el chat aprendió algo). */
  feedbackLeccion?: boolean;
}

export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** Auto-generated or user-set title */
  title: string;
  /** Ordered list of messages */
  messages: ChatMessage[];
  /** When this conversation was started */
  createdAt: Date;
  /** Last activity timestamp */
  updatedAt: Date;
}

// ============================================================================
// Conversation Management
// ============================================================================

/** Date group labels for conversation list */
export type DateGroup = 'Hoy' | 'Ayer' | 'Esta semana' | 'Anterior';

/** Lightweight conversation summary for list display */
export interface ConversationSummary {
  id: string;
  title: string;
  /** Preview of last message content (truncated) */
  preview: string;
  updatedAt: Date;
  /** Number of messages in the conversation */
  messageCount: number;
}

/** Serializable conversation for localStorage */
export interface SerializedConversation {
  id: string;
  title: string;
  messages: Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Agent Metadata
// ============================================================================

/** Display metadata for each agent type: label, Phosphor icon name, Tailwind color */
export const AGENT_METADATA: Record<AgentType, { label: string; icon: string; color: string }> = {
  cobranza:      { label: 'Cobranza',      icon: 'CurrencyDollar', color: 'emerald' },
  cotizador:     { label: 'Cotizador',     icon: 'FileText',       color: 'blue' },
  estudio:       { label: 'Estudio',       icon: 'ChartBar',       color: 'purple' },
  matching:      { label: 'Matching',      icon: 'FunnelSimple',   color: 'amber' },
  avaluo:        { label: 'Avalúos',       icon: 'Scales',         color: 'indigo' },
  conciliacion:  { label: 'Conciliación',  icon: 'ArrowsLeftRight', color: 'blue' },
  pagos:         { label: 'Pagos',         icon: 'Bank',           color: 'emerald' },
  pipeline:      { label: 'Pipeline',      icon: 'FunnelSimple',   color: 'blue' },
  mantenimiento: { label: 'Mantenimiento', icon: 'Wrench',         color: 'amber' },
  documentos:    { label: 'Documentos',    icon: 'FileText',       color: 'purple' },
  comunicacion:  { label: 'Comunicacion',  icon: 'ChatCircle',     color: 'pink' },
  reportes:      { label: 'Reportes',      icon: 'ChartBar',       color: 'indigo' },
};

// ============================================================================
// Briefing Types
// ============================================================================

/** A single section within a daily briefing (cobros, pipeline, mantenimiento, decisiones) */
export interface BriefingSection {
  id: string;
  title: string;
  /** Phosphor icon name (maps to ICON_MAP) */
  icon: string;
  /** Tailwind color token matching AGENT_METADATA */
  color: string;
  /** One-line summary always visible */
  summary: string;
  /** Detailed bullet points shown when expanded */
  details: string[];
  /** CTA label, e.g. "Cuéntame mas sobre cobros" */
  actionLabel?: string;
  /** Context string sent to chat when action is triggered */
  actionContext?: string;
}

/** A complete daily briefing with greeting and sectioned overview */
export interface DailyBriefing {
  id: string;
  date: Date;
  greeting: string;
  overallSummary: string;
  sections: BriefingSection[];
  /** Whether this briefing has been viewed yet */
  isNew: boolean;
}

// ============================================================================
// Hook State
// ============================================================================

// ============================================================================
// Preferences Types
// ============================================================================

/** Autonomy level for each agent type */
/**
 * 🔴 LOS TRES NIVELES DE AUTONOMÍA (Nico, 17/18-09-2026): «tenemos 3 niveles:
 * SOMBRA, COPILOT y AUTOMÁTICO; el usuario define», con SOMBRA por defecto.
 *
 * Los identificadores siguen siendo `manual` / `ask_first` / `auto` a
 * propósito: son lo que ya está guardado en las preferencias de la gente y en
 * `agent.agency_settings`. Renombrar el VALOR obligaría a migrar lo guardado y
 * dejaría a quien no migre en un nivel que el código no reconoce — y el que no
 * se reconoce nunca puede resolverse como «automático».
 *
 * Lo que cambia son los NOMBRES que se ven y el orden en que se ofrecen:
 *
 *   · `manual`    → **Sombra**: analiza y propone, no escribe ni llama.
 *   · `ask_first` → **Copilot**: prepara y una persona aprueba antes de salir.
 *   · `auto`      → **Automático**: actúa solo, dentro de la política.
 */
export type AutonomyLevel = 'auto' | 'ask_first' | 'manual';

/** El nivel por defecto: SOMBRA. «Sin elección del usuario, nunca automático.» */
export const NIVEL_POR_DEFECTO: AutonomyLevel = 'manual';

/** Communication tone preference */
export type CommunicationTone = 'formal' | 'professional' | 'casual';

/** Notification preferences per agent category */
export interface NotificationPreferences {
  /** Which categories to notify about */
  categories: Record<AgentType, boolean>;
  /** Notification channel preference */
  channel: 'in_app' | 'email' | 'whatsapp' | 'all';
}

/** Threshold settings for agent decision-making */
export interface ThresholdSettings {
  /** Days of mora tolerance before escalation */
  moraTolerance: number;
  /** Max maintenance budget (COP) before requiring approval */
  maintenanceBudgetLimit: number;
  /** Min risk score to auto-approve candidates */
  minCandidateScore: number;
}

/** User preferences for the AI Beta platform */
export interface BetaPreferences {
  /** Per-agent autonomy settings */
  autonomy: Record<AgentType, AutonomyLevel>;
  /** Notification preferences */
  notifications: NotificationPreferences;
  /** Communication tone */
  tone: CommunicationTone;
  /** Threshold settings */
  thresholds: ThresholdSettings;
}

// ============================================================================
// Hook State
// ============================================================================

export interface ChatState {
  /** All messages in the current conversation */
  messages: ChatMessage[];
  /** Whether the assistant is currently generating a response */
  isStreaming: boolean;
  /** Partial content being revealed during streaming */
  streamingContent: string;
}
