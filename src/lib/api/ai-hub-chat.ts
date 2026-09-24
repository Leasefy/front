'use client';

/**
 * ai-hub-chat — browser client for the agency AI chat home backend (F2).
 *
 * Wires the beta chat to the agent service's chat brain:
 *   POST /api/agency/:agencyId/ai-hub/chat          (one-shot JSON)
 *   POST /api/agency/:agencyId/ai-hub/chat/stream   (SSE: snapshot→message→dispatch_*→done)
 *
 * The SSE transport is POST (the message is in the body), so we consume it with
 * fetch + a stream reader — NOT EventSource (GET-only). Auth = Supabase bearer
 * via agentAuthHeaders(); base URL = NEXT_PUBLIC_AGENT_URL.
 *
 * Pure mappers (backend → the front `beta-chat` contract) + the SSE parser are
 * exported for unit testing without a browser/network.
 */

import { leerBloques, leerEntidades, type BloqueDeRespuesta, type EntidadDelChat } from '@/lib/chat/bloques';
import {
  leerAcciones,
  leerConfirmacion,
  leerFormulario,
  leerIntencion,
  leerResultado,
  type AccionDelHilo,
  type ConfirmacionEnElHilo,
  type FormularioEnElHilo,
  type IntencionDelChat,
  type ResultadoEnElHilo,
} from '@/lib/chat/acciones-del-hilo';
import {
  leerEventoProcesoIniciado,
  leerTarjetaDeEjecucion,
  type EventoProcesoIniciado,
  type TarjetaDeEjecucion,
} from '@/lib/chat/tarjetas-de-ejecucion';
import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { ApiError, errorDeDemasiadasSolicitudes } from '@/lib/api/client';
import type { BackendAccionPropuesta } from '@/lib/api/ai-hub-acciones';
import type {
  AgentType,
  AgentExecution,
  ResponseAction,
  DailyBriefing,
  BriefingSection,
  Reintentable,
} from '@/lib/types/beta-chat';

// ── Backend contract (mirror of the agent's agency-ai-hub-chat[-stream]) ──────

export type BackendDispatchAgent =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'avaluo'
  | 'conciliacion'
  | 'pagos'
  // El agente despacha además `reportes` (consultas a los datos) y
  // `comunicacion` (el que PREPARA acciones para confirmar). Los dos ya existen
  // en `AGENT_METADATA`, que es lo que importa: `turn-steps` hace
  // `AGENT_METADATA[clave].label` sin guarda y una clave desconocida revienta
  // el chat entero con un `undefined.label`.
  | 'reportes'
  | 'comunicacion';

// ── Action Proposal contract (backend → front, F5) ────────────────────────────

export type BackendActionProposalColaType = 'conciliacion' | 'pagos' | 'cobranza';
export type BackendActionProposalAction = 'confirm' | 'reject' | 'approve' | 'claim' | 'resolve';

/** Shape of the `action_proposal` SSE event data. */
export interface BackendActionProposal {
  workItemId: string;
  colaType: BackendActionProposalColaType;
  action: BackendActionProposalAction;
  resumen: string;
  requiresConfirmation: true;
}

export type BackendActionTarget =
  | 'cobranza'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'pagos'
  | 'conciliacion'
  | 'avaluo'
  | 'cartera';

export interface BackendSuggestedAction {
  label: string;
  target: BackendActionTarget;
  /**
   * Lo que pide el botón, con forma (23-09, «todo en el chat»): el micro la
   * pega cuando la lee sin duda («Ver contrato 24» → ver el contrato 24).
   * Opcional: sin ella el botón manda su texto y lo contesta el modelo.
   */
  intencion?: unknown;
}

/**
 * Acción VINCULANTE que un especialista propuso y que el chat NO ejecuta.
 *
 * El agente la manda por el evento `pending_approval`; el front la muestra como
 * tarjeta de decisión. Resolverla NO ejecuta nada: registra la decisión del
 * operador (el backend la usa como señal de aprendizaje) y la ejecución sigue
 * viviendo en el frente correspondiente.
 */
export interface BackendPendingApproval {
  id: string;
  agent: BackendDispatchAgent;
  actionType: string;
  title: string;
  description: string;
  payloadPreview: Record<string, string>;
  options: {
    id: string;
    label: string;
    description: string;
    recommendation: 'recommended' | 'neutral' | 'not_recommended';
  }[];
  requiresApproval: true;
}

export interface BackendDispatch {
  agent: BackendDispatchAgent;
  taskDescription: string;
  status: 'completed' | 'failed';
  summary: string;
  nextStep?: string;
}

export interface BackendSnapshot {
  deudoresActivos: number;
  pagadoHoyCop: number;
  llamadasHoy: number;
  escalacionesPendientes: number;
  enPrejuridico: number;
  generatedAt: string;
  /** La cartera del ERP (Pagos → Cartera). Opcional: un micro viejo no la manda. */
  carteraCop?: number;
  contratosEnCartera?: number;
}

export interface BackendChatResponse {
  responseText: string;
  suggestedActions: BackendSuggestedAction[];
  dispatches: BackendDispatch[];
  /**
   * 🔴 Acciones VINCULANTES propuestas este turno (no ejecutadas).
   *
   * El contrato del agente siempre las trajo (`AiHubChatResponse.pendingApprovals`)
   * y este espejo las omitía: por el camino de respaldo POST —el que corre
   * cuando el stream se cae— una aprobación propuesta no llegaba nunca a
   * `<DecisionCard>` y el operador no se enteraba de que había algo que decidir.
   * Opcional porque un backend viejo puede no mandarlas.
   */
  pendingApprovals?: BackendPendingApproval[];
  /**
   * Acciones que el chat PREPARÓ este turno y esperan confirmación (recordatorio
   * de pago, mensaje, PQRS, mantenimiento). Nada se ejecutó: la tarjeta es la
   * que pregunta, y el «Confirmar» va a `/ai-hub/chat/acciones/:id/confirmar`.
   * Opcional porque un agente viejo no las manda.
   */
  accionesPropuestas?: BackendAccionPropuesta[];
  /**
   * El id de este turno en el cerebro del micro (23-09). Opcional porque un
   * micro viejo no lo manda; sin él no salen las señales de la pantalla.
   */
  turnoId?: string;
  /** Una consulta del turno falló y vale reintentar (ver `leerReintentable`). */
  reintentable?: unknown;
  snapshot: BackendSnapshot | null;
  generatedAt: string;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// ── Mappers (backend → front beta-chat contract) ──────────────────────────────

/**
 * Backend dispatch agent → the front `AgentType`. 1:1 since F4 aligned the
 * front enum with the real roster (cobranza/cotizador/estudio/matching).
 */
export function backendAgentToFrontType(agent: BackendDispatchAgent): AgentType {
  return agent;
}

const TARGET_ICON: Record<BackendActionTarget, string> = {
  cobranza: 'CurrencyDollar',
  cotizador: 'ShieldCheck',
  estudio: 'FileText',
  matching: 'FunnelSimple',
  pagos: 'Bank',
  conciliacion: 'ArrowsLeftRight',
  avaluo: 'Scales',
  cartera: 'ChartBar',
};

/**
 * 🔴 Una sugerencia del asistente es un MENSAJE DE LA PERSONA, nunca un enlace.
 *
 * Nico, 23-09 (22:51), con la captura de «Ver contrato 24» y «Gestionar
 * cobranza de Mateo Pérez» sacándolo del chat: «Debe todo funcionar dentro del
 * chat: si le digo "ver contrato", es como un mensaje de la persona y tú traes
 * acá el contrato». Hasta ese día, una sugerencia con pantalla en el panel
 * navegaba (`href`) porque preguntarle al asistente tardaba ~25 s; ahora el
 * micro la contesta por su camino directo, con la ficha, en ~2 s.
 *
 * Por eso ya no hay `href`: el botón manda la etiqueta como mensaje, con la
 * intención que el micro le pegó cuando la pudo leer sin duda.
 */
export function suggestedActionToResponseAction(
  action: BackendSuggestedAction,
  index: number,
): ResponseAction {
  const intencion = leerIntencion(action.intencion);
  return {
    id: `act_${index}_${action.target}`,
    label: action.label,
    prompt: action.label,
    ...(intencion ? { intencion } : {}),
    icon: TARGET_ICON[action.target] ?? 'ArrowRight',
    variant: index === 0 ? 'primary' : 'secondary',
  };
}

/** A finished backend dispatch → a terminal front `AgentExecution`. */
export function dispatchToAgentExecution(
  dispatch: BackendDispatch,
  startedAt: Date,
): AgentExecution {
  return {
    id: `disp_${dispatch.agent}_${startedAt.getTime()}`,
    agentType: backendAgentToFrontType(dispatch.agent),
    taskDescription: dispatch.taskDescription,
    status: dispatch.status,
    startedAt,
    completedAt: new Date(),
    ...(dispatch.status === 'failed' ? { error: dispatch.summary } : {}),
  };
}

/**
 * `reintentable` del `done` (contrato fijo con el micro, 23-09): la consulta
 * del turno no respondió (`motivo`: tiempo/red/servidor; `que`:
 * busqueda/cartera/ficha/cifras) y vale la pena volver a preguntar. Vale
 * cualquier objeto con los dos textos; lo demás es «no llegó» → `null`, y la
 * respuesta no lleva el botón. Nunca se deduce del texto de la respuesta.
 */
export function leerReintentable(v: unknown): Reintentable | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const { motivo, que } = v as Record<string, unknown>;
  if (typeof motivo !== 'string' || !motivo || typeof que !== 'string' || !que) return null;
  return { motivo, que };
}

// ── SSE parsing (pure, testable) ──────────────────────────────────────────────

export interface ChatStreamHandlers {
  onSnapshot?: (snapshot: BackendSnapshot | null) => void;
  onMessage?: (
    responseText: string,
    suggestedActions: BackendSuggestedAction[],
  ) => void;
  onDispatchStart?: (
    agent: BackendDispatchAgent,
    taskDescription: string,
  ) => void;
  onDispatchResult?: (dispatch: BackendDispatch) => void;
  /** Called for each `action_proposal` SSE event (F5). */
  onActionProposal?: (proposal: BackendActionProposal) => void;
  /**
   * Un paso INTERNO del especialista despachado: la herramienta que acabó de
   * ejecutar, ya traducida a lenguaje de operador por el backend. Es lo que
   * llena el silencio entre `dispatch_start` y `dispatch_result`.
   */
  onToolStep?: (step: { agent: BackendDispatchAgent; tool: string; label: string }) => void;
  /**
   * Un especialista propuso una acción vinculante que necesita el visto bueno
   * de una persona. Sin este manejador el evento se perdía en silencio: el
   * agente lo emitía y el front no tenía el caso, así que el operador nunca se
   * enteraba de que había algo esperándolo.
   */
  onPendingApproval?: (approval: BackendPendingApproval) => void;
  /**
   * El chat dejó preparada una ACCIÓN que espera confirmación. Llega por su
   * propio evento para que la tarjeta aparezca apenas existe, y otra vez dentro
   * del `done` para que el front reconcilie igual que con las aprobaciones.
   */
  onAccionPropuesta?: (propuesta: BackendAccionPropuesta) => void;
  /**
   * Qué está haciendo AHORA el paso activo (evento aditivo `progreso`, 23-09):
   * «Leyendo contratos…», «Leí 29 filas de contratos». Un micro viejo no lo
   * manda y el paso se queda con su indicador animado.
   */
  onProgreso?: (p: { texto: string; hechos?: number; total?: number }) => void;
  /**
   * La acción arrancó un PROCESO LARGO en el back (SSE `proceso_iniciado`,
   * 24-09). Sale antes del `done`: el chat lo sigue con el Centro de procesos
   * (con su propio JWT) y, cuando termina, pide la tarjeta al día al micro.
   */
  onProcesoIniciado?: (evento: EventoProcesoIniciado) => void;
  onDone?: (final: {
    responseText: string;
    suggestedActions: BackendSuggestedAction[];
    dispatches: BackendDispatch[];
    generatedAt: string;
    /** Tablas/cifras/avisos con forma. Vacío si el micro no los manda. */
    bloques: BloqueDeRespuesta[];
    /** Las tarjetas de la búsqueda en la plataforma. */
    entidades: EntidadDelChat[];
    /** El id del turno en el cerebro del micro. Falta con un micro viejo. */
    turnoId?: string;
    /** Una consulta del turno falló y vale reintentar. Falta con un micro viejo. */
    reintentable?: Reintentable;
    /** «Todo en el chat» (23-09): lo que se puede hacer, la tarjeta de «¿Lo hago?», el resultado, el formulario. */
    acciones: AccionDelHilo[];
    confirmacion: ConfirmacionEnElHilo | null;
    resultado: ResultadoEnElHilo | null;
    formulario: FormularioEnElHilo | null;
    /**
     * La tarjeta del ejecutor (24-09): propuesta, en curso, resultado (con la
     * gracia de P-10), programada o error. `null` con un micro de antes: ahí
     * mandan `confirmacion` y `resultado`, como siempre.
     */
    ejecucion: TarjetaDeEjecucion | null;
    /** El turno corrió en modo ensayo del servidor: nada se ejecutó ni se programó. */
    ensayo: boolean;
    /**
     * Por dónde lo contestó el micro. `directo:*` = el camino directo (la ficha,
     * sin el modelo): es un DATO, se muestra de una, sin teclearlo (23-09).
     */
    camino?: string;
  }) => void;
  /**
   * Un fallo ANUNCIADO dentro del stream (evento `error`).
   *
   * 🔴 `status` y `code` viajan porque la respuesta HTTP ya salió con 200 —es
   * un stream— así que sin ellos no queda NINGÚN código en ningún lado: el
   * panel leía cualquier corte como «no pude conectarme», incluida la cuenta
   * sin saldo, que es la única que se arregla recargando créditos (auditoría
   * 13-09, caso B2).
   */
  onError?: (message: string, meta?: { status?: number; code?: string }) => void;
}

/**
 * Split accumulated SSE text on event boundaries (a blank line). Returns the
 * complete event blocks plus the trailing partial remainder to carry forward.
 */
export function splitSSEEvents(buffer: string): {
  events: string[];
  rest: string;
} {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts.filter((p) => p.trim().length > 0), rest };
}

/**
 * Parse one SSE event block (`event: <name>\ndata: <json>`) and dispatch it to
 * the matching handler. Malformed JSON / unknown events are ignored.
 */
export function handleSSEEvent(
  rawEvent: string,
  handlers: ChatStreamHandlers,
): void {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join('\n'));
  } catch {
    return;
  }
  const obj = (data ?? {}) as Record<string, unknown>;

  switch (eventName) {
    case 'snapshot':
      handlers.onSnapshot?.((data as BackendSnapshot | null) ?? null);
      break;
    case 'message':
      handlers.onMessage?.(
        String(obj.responseText ?? ''),
        (obj.suggestedActions as BackendSuggestedAction[]) ?? [],
      );
      break;
    case 'dispatch_start':
      handlers.onDispatchStart?.(
        obj.agent as BackendDispatchAgent,
        String(obj.taskDescription ?? ''),
      );
      break;
    case 'dispatch_result':
      if (obj.dispatch) handlers.onDispatchResult?.(obj.dispatch as BackendDispatch);
      break;
    case 'pending_approval': {
      const ap = obj.approval as BackendPendingApproval | undefined;
      if (ap && typeof ap.id === 'string' && Array.isArray(ap.options) && ap.options.length > 0) {
        handlers.onPendingApproval?.(ap);
      }
      break;
    }
    case 'accion_propuesta': {
      const p = obj.propuesta as BackendAccionPropuesta | undefined;
      // Una propuesta sin id no se puede confirmar: se ignora en vez de pintar
      // una tarjeta con un botón que no lleva a ningún lado.
      if (p && typeof p.id === 'string' && p.id) handlers.onAccionPropuesta?.(p);
      break;
    }
    case 'tool_step': {
      const tool = obj.tool;
      const label = obj.label;
      if (typeof tool === 'string' && tool) {
        handlers.onToolStep?.({
          agent: obj.agent as BackendDispatchAgent,
          tool,
          label: typeof label === 'string' && label ? label : tool,
        });
      }
      break;
    }
    case 'action_proposal': {
      // Validate the minimum required fields before forwarding (D-42-03 fail-open).
      const workItemId = obj.workItemId;
      const colaType = obj.colaType;
      const action = obj.action;
      const resumen = obj.resumen;
      if (
        typeof workItemId === 'string' && workItemId &&
        typeof colaType === 'string' && colaType &&
        typeof action === 'string' && action &&
        typeof resumen === 'string' && resumen
      ) {
        handlers.onActionProposal?.({
          workItemId,
          colaType: colaType as BackendActionProposalColaType,
          action: action as BackendActionProposalAction,
          resumen,
          requiresConfirmation: true,
        });
      } else {
        // Malformed — warn and silently skip (never breaks the stream).
        if (typeof console !== 'undefined') {
          console.warn('[ai-hub-chat] malformed action_proposal event ignored', obj);
        }
      }
      break;
    }
    case 'progreso': {
      const texto = obj.texto;
      if (typeof texto === 'string' && texto.trim()) {
        handlers.onProgreso?.({
          texto: texto.trim(),
          ...(typeof obj.hechos === 'number' ? { hechos: obj.hechos } : {}),
          ...(typeof obj.total === 'number' ? { total: obj.total } : {}),
        });
      }
      break;
    }
    case 'proceso_iniciado': {
      // Sin sus dos ids no hay qué seguir: se ignora sin romper el stream.
      const evento = leerEventoProcesoIniciado(obj);
      if (evento) handlers.onProcesoIniciado?.(evento);
      break;
    }
    case 'done': {
      const reintentable = leerReintentable(obj.reintentable);
      handlers.onDone?.({
        responseText: String(obj.responseText ?? ''),
        suggestedActions: (obj.suggestedActions as BackendSuggestedAction[]) ?? [],
        dispatches: (obj.dispatches as BackendDispatch[]) ?? [],
        generatedAt: String(obj.generatedAt ?? ''),
        bloques: leerBloques(obj.bloques),
        entidades: leerEntidades(obj.entidades),
        ...(typeof obj.turnoId === 'string' && obj.turnoId ? { turnoId: obj.turnoId } : {}),
        ...(reintentable ? { reintentable } : {}),
        acciones: leerAcciones(obj.acciones),
        confirmacion: leerConfirmacion(obj.confirmacion),
        resultado: leerResultado(obj.resultado),
        formulario: leerFormulario(obj.formulario),
        // Aditivo (24-09): un `done` viejo no las trae → `null` / `false`.
        ejecucion: leerTarjetaDeEjecucion(obj.ejecucion),
        ensayo: obj.ensayo === true,
        ...(typeof obj.camino === 'string' && obj.camino ? { camino: obj.camino } : {}),
      });
      break;
    }
    case 'error':
      handlers.onError?.(String(obj.error ?? 'stream error'), {
        ...(typeof obj.status === 'number' ? { status: obj.status } : {}),
        ...(typeof obj.code === 'string' ? { code: obj.code } : {}),
      });
      break;
    default:
      break;
  }
}

// ── Network ───────────────────────────────────────────────────────────────────

/**
 * El fallo del agente, entero.
 *
 * 🔴 Antes: `throw new Error('ai-hub chat ' + status)`. El status quedaba
 * enterrado en un texto y el cuerpo se tiraba: un 402 (el plan se quedó sin
 * créditos de IA) y un 429 terminaban en la burbuja como «no pude
 * conectarme», igual que un 500. Con `ApiError`, `clasificarFallo` los
 * distingue.
 */
async function falloDelAgente(res: Response, que: string): Promise<ApiError> {
  // El 429 del micro (su limitador, o el `agents_limit` de NGINX) se dice
  // IGUAL que el del back: «Espera 45 segundos y vuelve a intentar», con el
  // número cuando viene en el cuerpo o en `Retry-After`. Antes pasaba el
  // `message` crudo del micro (en inglés, o «ai-hub chat 429») y la burbuja
  // decía «espera un momento» sin plazo, que invita a machacar el botón y
  // alarga el bloqueo (auditoría de seguridad 23-09).
  if (res.status === 429) return errorDeDemasiadasSolicitudes(res);
  let cuerpo: Record<string, unknown> | undefined;
  try {
    const json: unknown = await res.json();
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      cuerpo = json as Record<string, unknown>;
    }
  } catch {
    // Sin cuerpo JSON (un proxy que devuelve HTML, por ejemplo): queda el status.
  }
  const crudo = cuerpo?.message ?? cuerpo?.error;
  const mensaje =
    typeof crudo === 'string'
      ? crudo
      : Array.isArray(crudo) && crudo.every((x) => typeof x === 'string')
        ? (crudo as string[])
        : `${que} ${res.status}`;
  const code = typeof cuerpo?.code === 'string' ? cuerpo.code : undefined;
  return new ApiError(res.status, mensaje, code, cuerpo);
}

function agentBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_AGENT_URL not configured');
  return base;
}

/** Whether the agent backend is reachable in this build (dev posture check). */
export function isAgentConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AGENT_URL);
}

function buildBody(message: string, history?: ChatHistoryEntry[], intencion?: IntencionDelChat | null): string {
  return JSON.stringify({
    message,
    ...(history && history.length > 0 ? { history } : {}),
    // Lo que pidió el botón, con forma: el micro lo atiende por su camino
    // directo (la ficha) sin adivinar el texto.
    ...(intencion ? { intencion } : {}),
  });
}

/** One-shot, non-streaming turn (used as the streaming fallback). */
export async function postChatTurn(args: {
  agencyId: string;
  message: string;
  history?: ChatHistoryEntry[];
  intencion?: IntencionDelChat | null;
  signal?: AbortSignal;
}): Promise<BackendChatResponse> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: buildBody(args.message, args.history, args.intencion),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) throw await falloDelAgente(res, 'ai-hub chat');
  return (await res.json()) as BackendChatResponse;
}

/**
 * Registra la decisión del operador sobre una acción vinculante propuesta.
 *
 * 🔴 NO ejecuta la acción — el propio endpoint lo dice: «Does NOT execute the
 * binding action — that stays gated in the agent's frente». Lo que hace es
 * dejar constancia de si la propuesta se aceptó o no, que es la señal con la
 * que el chat aprende. La UI tiene que decirlo con esas palabras.
 */
export async function resolveChatApproval(args: {
  agencyId: string;
  approvalId: string;
  outcome: 'approved' | 'rejected';
}): Promise<void> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/approvals/${encodeURIComponent(args.approvalId)}/resolve`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ outcome: args.outcome }),
  });
  if (!res.ok) throw new Error(`ai-hub approval ${res.status}`);
}

/**
 * La tarjeta de HOY de una ejecución del chat (24-09):
 * `GET /api/agency/:agencyId/ai-hub/chat/ejecuciones/:ejecucionId` → `{ tarjeta }`.
 *
 * 🔴 No es una lectura pasiva, y por eso sólo se llama en tres momentos: cuando
 * termina la cuenta regresiva de la gracia de P-10, al volver a una programada
 * cuya hora ya pasó y cuando el Centro de procesos ve terminar el proceso que
 * arrancó la acción. Si lo programado ya tocaba, el micro lo manda AHORA con la
 * sesión de la persona (una sola vez por ejecución); si había un proceso, lo
 * cierra. Nunca en un bucle.
 *
 * `null` si el micro no la tiene (404: no es tuya, o falta su migración) o no
 * se entiende; un fallo de red o un 5xx lanza (`ApiError`), para que quien la
 * pidió decida si vuelve a preguntar.
 */
export async function fetchEjecucion(args: {
  agencyId: string;
  ejecucionId: string;
  signal?: AbortSignal;
}): Promise<TarjetaDeEjecucion | null> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/ejecuciones/${encodeURIComponent(args.ejecucionId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: agentAuthHeaders(),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw await falloDelAgente(res, 'ai-hub chat ejecucion');
  const cuerpo: unknown = await res.json().catch(() => null);
  const tarjeta = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>).tarjeta : null;
  return leerTarjetaDeEjecucion(tarjeta);
}

/**
 * Streaming turn over SSE. Calls the handlers in order as events arrive. Throws
 * if the request can't be opened (the caller falls back to postChatTurn).
 */
export async function streamChatTurn(args: {
  agencyId: string;
  message: string;
  history?: ChatHistoryEntry[];
  intencion?: IntencionDelChat | null;
  signal?: AbortSignal;
  handlers: ChatStreamHandlers;
}): Promise<void> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({
      'content-type': 'application/json',
      accept: 'text/event-stream',
    }),
    body: buildBody(args.message, args.history, args.intencion),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) throw await falloDelAgente(res, 'ai-hub chat stream');
  if (!res.body) throw new Error('ai-hub chat stream sin cuerpo');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = splitSSEEvents(buffer);
      buffer = rest;
      for (const event of events) handleSSEEvent(event, args.handlers);
    }
    // Flush any trailing event without a final blank line.
    const tail = buffer + decoder.decode();
    const { events } = splitSSEEvents(tail + '\n\n');
    for (const event of events) handleSSEEvent(event, args.handlers);
  } finally {
    reader.releaseLock();
  }
}

// ── Action execution (POST /api/agency/:id/ai-hub/actions/execute) ───────────

export interface ExecuteActionArgs {
  agencyId: string;
  workItemId: string;
  action: BackendActionProposalAction;
  reason?: string;
  signal?: AbortSignal;
}

/**
 * Execute a confirmed action proposal. Throws on non-2xx (the caller keeps the
 * error on the message). La tarjeta F5 que lo pintaba (`ActionProposalCard`)
 * se retiró el 24-09: ninguna pantalla la montaba; lo que el chat ejecuta hoy
 * se ve con `TarjetaDeEjecucion`.
 */
export async function executeAction(args: ExecuteActionArgs): Promise<unknown> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/actions/execute`;
  const body: Record<string, unknown> = {
    workItemId: args.workItemId,
    action: args.action,
  };
  if (args.reason) body.reason = args.reason;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) {
    let message = `execute action ${res.status}`;
    try {
      const err = (await res.json()) as Record<string, unknown>;
      if (typeof err.error === 'string') message = err.error;
      else if (typeof err.message === 'string') message = err.message;
    } catch {
      // ignore parse error — use default message
    }
    throw new Error(message);
  }
  return res.json();
}

// ── Daily briefing (GET /api/agency/:id/ai-hub/briefing) ─────────────────────
//
// The briefing endpoint is being built by a sibling effort, so the mapper is
// deliberately TOLERANT: it accepts a `sections[]` payload if present, can
// synthesize sections from the chat snapshot shape otherwise, and returns
// `null` for anything unusable — the hook then keeps the mock briefing
// (fail-open: this PR ships independently of the backend).

/** Loose mirror of the (in-progress) backend briefing payload. */
export interface BackendBriefingSection {
  id?: string;
  title?: string;
  icon?: string;
  color?: string;
  summary?: string;
  details?: string[];
  actionLabel?: string;
  actionContext?: string;
}

export interface BackendBriefing {
  id?: string;
  greeting?: string;
  overallSummary?: string;
  sections?: BackendBriefingSection[];
  snapshot?: BackendSnapshot | null;
  generatedAt?: string;
}

/** Icons that BriefingCard's ICON_MAP can actually render (unknown → no icon). */
const SAFE_BRIEFING_ICONS = new Set([
  'CurrencyDollar',
  'FunnelSimple',
  'Wrench',
  'FileText',
  'ChatCircle',
  'ChartBar',
  'ListChecks',
]);

const SAFE_BRIEFING_COLORS = new Set([
  'emerald',
  'blue',
  'amber',
  'purple',
  'pink',
  'indigo',
]);

/** Default icon/color per well-known section id (cobranza-centric roster). */
const SECTION_DEFAULTS: Record<string, { icon: string; color: string }> = {
  cobros: { icon: 'CurrencyDollar', color: 'emerald' },
  cobranza: { icon: 'CurrencyDollar', color: 'emerald' },
  escalaciones: { icon: 'ChatCircle', color: 'amber' },
  prejuridico: { icon: 'FileText', color: 'purple' },
  llamadas: { icon: 'ChartBar', color: 'blue' },
};

function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function greetingForHour(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Map one backend section if it has the minimum usable shape (title+summary). */
function mapBriefingSection(raw: BackendBriefingSection): BriefingSection | null {
  if (typeof raw?.title !== 'string' || typeof raw?.summary !== 'string') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : raw.title.toLowerCase();
  const defaults = SECTION_DEFAULTS[id] ?? { icon: 'ListChecks', color: 'blue' };
  return {
    id,
    title: raw.title,
    icon:
      typeof raw.icon === 'string' && SAFE_BRIEFING_ICONS.has(raw.icon)
        ? raw.icon
        : defaults.icon,
    color:
      typeof raw.color === 'string' && SAFE_BRIEFING_COLORS.has(raw.color)
        ? raw.color
        : defaults.color,
    summary: raw.summary,
    details: Array.isArray(raw.details)
      ? raw.details.filter((d): d is string => typeof d === 'string')
      : [],
    ...(typeof raw.actionLabel === 'string' ? { actionLabel: raw.actionLabel } : {}),
    ...(typeof raw.actionContext === 'string'
      ? { actionContext: raw.actionContext }
      : {}),
  };
}

/** Synthesize briefing sections from the chat snapshot (real "Hoy" numbers). */
export function sectionsFromSnapshot(snapshot: BackendSnapshot): BriefingSection[] {
  const sections: BriefingSection[] = [
    {
      id: 'cobros',
      title: 'Cobranza',
      icon: 'CurrencyDollar',
      color: 'emerald',
      summary: `${formatCop(snapshot.pagadoHoyCop)} recaudados hoy · ${snapshot.deudoresActivos} deudores en gestión.`,
      details: [`Llamadas realizadas hoy: ${snapshot.llamadasHoy}.`],
      actionLabel: 'Cuéntame más sobre cobranza',
      actionContext:
        '¿Cómo va la cobranza hoy y qué acciones recomiendas para los deudores en gestión?',
    },
  ];
  if (snapshot.escalacionesPendientes > 0) {
    sections.push({
      id: 'escalaciones',
      title: 'Escalaciones',
      icon: 'ChatCircle',
      color: 'amber',
      summary: `${snapshot.escalacionesPendientes} escalaciones esperando atención de tu equipo.`,
      details: [],
      actionLabel: 'Ver escalaciones pendientes',
      actionContext: '¿Qué escalaciones tengo pendientes y cuáles son las más urgentes?',
    });
  }
  if (snapshot.enPrejuridico > 0) {
    sections.push({
      id: 'prejuridico',
      title: 'Prejurídico',
      icon: 'FileText',
      color: 'purple',
      summary: `${snapshot.enPrejuridico} deudores en etapa prejurídica o posterior.`,
      details: [],
      actionLabel: 'Revisar casos prejurídicos',
      actionContext: '¿Cuál es el estado de los deudores en etapa prejurídica?',
    });
  }
  return sections;
}

/**
 * Tolerant backend → `DailyBriefing` mapper. Returns `null` when the payload
 * has neither usable sections nor a snapshot (caller keeps the mock briefing).
 */
export function mapBackendBriefing(raw: unknown): DailyBriefing | null {
  if (!raw || typeof raw !== 'object') return null;
  const briefing = raw as BackendBriefing;

  const mappedSections = Array.isArray(briefing.sections)
    ? briefing.sections
        .map(mapBriefingSection)
        .filter((s): s is BriefingSection => s !== null)
    : [];
  const sections =
    mappedSections.length > 0
      ? mappedSections
      : briefing.snapshot
        ? sectionsFromSnapshot(briefing.snapshot)
        : [];
  if (sections.length === 0) return null;

  const generatedAt = briefing.generatedAt ?? briefing.snapshot?.generatedAt;
  const parsedDate = generatedAt ? new Date(generatedAt) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return {
    id:
      typeof briefing.id === 'string' && briefing.id
        ? briefing.id
        : `brief_real_${date.toISOString().slice(0, 10)}`,
    date,
    greeting:
      typeof briefing.greeting === 'string' && briefing.greeting
        ? briefing.greeting
        : `${greetingForHour(date)}, este es el resumen de tu inmobiliaria hoy.`,
    overallSummary:
      typeof briefing.overallSummary === 'string' && briefing.overallSummary
        ? briefing.overallSummary
        : sections.map((s) => s.summary).join(' '),
    sections,
    isNew: true,
  };
}

/**
 * Fetch today's real briefing. Fail-open by design: any non-OK status (404
 * while the endpoint ships, 5xx), network error, or unusable payload resolves
 * to `null` — never throws — so the caller can keep its mock briefing.
 */
export async function fetchBriefing(args: {
  agencyId: string;
  signal?: AbortSignal;
}): Promise<DailyBriefing | null> {
  try {
    const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/briefing`;
    const res = await fetch(url, {
      method: 'GET',
      headers: agentAuthHeaders(),
      ...(args.signal ? { signal: args.signal } : {}),
    });
    if (!res.ok) return null;
    return mapBackendBriefing(await res.json());
  } catch {
    return null;
  }
}
