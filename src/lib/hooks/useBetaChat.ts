'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  Conversation,
  ConversationSummary,
  MessageStatus,
  SerializedConversation,
  AgentActivityBlock,
  AgentExecution,
  AgentExecutionStatus,
  PendingDecision,
  ResponseMeta,
  BetaPreferences,
  ActionProposal,
  ChatSnapshot,
  TurnStep,
} from '@/lib/types/beta-chat';
import type { DailyBriefing } from '@/lib/types/beta-chat';
import { DEFAULT_PREFERENCES } from '@/lib/data/default-preferences';
import { useAuth } from '@/lib/auth/use-auth';
import {
  postChatTurn,
  streamChatTurn,
  fetchBriefing,
  isAgentConfigured,
  suggestedActionToResponseAction,
  backendAgentToFrontType,
  executeAction,
  resolveChatApproval,
  type BackendDispatch,
  type BackendSuggestedAction,
  type BackendActionProposal,
  type BackendPendingApproval,
  type BackendSnapshot,
} from '@/lib/api/ai-hub-chat';

/**
 * Backend snapshot (has `generatedAt`) → the front `ChatSnapshot` (numeric KPIs
 * only). Returns `null` when the backend didn't emit one for this turn.
 */
function backendSnapshotToChat(s: BackendSnapshot | null): ChatSnapshot | null {
  if (!s) return null;
  return {
    deudoresActivos: s.deudoresActivos,
    pagadoHoyCop: s.pagadoHoyCop,
    llamadasHoy: s.llamadasHoy,
    escalacionesPendientes: s.escalacionesPendientes,
    enPrejuridico: s.enPrejuridico,
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Aprobación vinculante del backend → la tarjeta de decisión del front.
 *
 * Vive a nivel de módulo porque la usan LAS DOS rutas: el evento
 * `pending_approval` del stream y el `pendingApprovals` de la respuesta POST de
 * respaldo (que el espejo del front omitía, así que por ahí la aprobación se
 * perdía en silencio).
 */
export function aprobacionADecision(approval: BackendPendingApproval): PendingDecision {
  return {
    id: approval.id,
    approvalId: approval.id,
    title: approval.title,
    description: approval.description,
    category: backendAgentToFrontType(approval.agent),
    options: approval.options.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      recommendation: o.recommendation,
    })),
  };
}

const CHARS_PER_SECOND = 40;
const LONG_PAUSE_CHARS = new Set(['.', '!', '?']);
const SHORT_PAUSE_CHARS = new Set([',', ';', ':']);
const LONG_PAUSE_MULTIPLIER = 6;
const SHORT_PAUSE_MULTIPLIER = 3;

const STORAGE_KEY = 'leasefy-beta-conversations';
const STORAGE_VERSION_KEY = 'leasefy-beta-storage-version';
const CURRENT_STORAGE_VERSION = 3; // v3 = Clean minimal Synapse-inspired redesign
const PREFERENCES_STORAGE_KEY = 'leasefy-beta-preferences';
// Marca del viejo «reset diario» (ya retirado). Se conserva sólo para poder
// BORRARLA de los navegadores que la tengan; nada la lee para decidir.
const DAILY_RESET_KEY = 'leasefy-beta-last-day';
const TITLE_MAX_LENGTH = 50;
const PREVIEW_MAX_LENGTH = 80;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Auto-generate conversation title from first user message */
function generateTitle(text: string): string {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (cleaned.length <= TITLE_MAX_LENGTH) return cleaned;
  return cleaned.slice(0, TITLE_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

/** Create a preview string from the last message */
function getPreview(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'Nueva conversacion';
  const last = messages[messages.length - 1];
  // Sin markdown crudo en el preview: el historial mostraba «**Deudores
  // activos» y «- ** El resumen…» — los asteriscos y guiones del formato
  // metidos en una línea de texto plano. Se quitan las marcas, no el texto.
  const text = last.content
    .replace(/```[\s\S]*?```/g, ' ')          // bloques de código
    .replace(/`([^`]*)`/g, '$1')                // código en línea
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links e imágenes → su texto
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')        // encabezados
    .replace(/^\s*[-*+]\s+/gm, '')             // viñetas
    .replace(/^\s*\d+\.\s+/gm, '')            // listas numeradas
    .replace(/(\*\*|__)(.*?)\1/g, '$2')        // negrita
    .replace(/(\*|_)(.*?)\1/g, '$2')           // cursiva
    .replace(/^\s*>\s?/gm, '')                 // citas
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (text.length <= PREVIEW_MAX_LENGTH) return text;
  return text.slice(0, PREVIEW_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

function createEmptyConversation(): Conversation {
  const now = new Date();
  return {
    id: generateId(),
    title: 'Nueva conversacion',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// localStorage Persistence
// ============================================================================

function serializeConversations(conversations: Conversation[]): string {
  const serialized: SerializedConversation[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
  return JSON.stringify(serialized);
}

function deserializeConversations(json: string): Conversation[] {
  try {
    const parsed: SerializedConversation[] = JSON.parse(json);
    return parsed.map((c) => ({
      id: c.id,
      title: c.title,
      messages: c.messages.map((m) => {
        // Un mensaje guardado a mitad de vuelo (`sending` / `streaming`) no
        // tiene ninguna petición viva detrás cuando se recarga la página:
        // se quedaba mostrando el orbe para siempre (Nico, 2026-08-27: «¿por
        // qué quedan ahí solos?»). Se cierra como interrumpido, con texto, y
        // así el avatar pasa al de marca y «Rehacer» sigue disponible.
        const enVuelo =
          m.role === 'assistant' && (m.status === 'sending' || m.status === 'streaming');
        return {
          ...m,
          timestamp: new Date(m.timestamp),
          ...(enVuelo
            ? {
                status: 'complete' as const,
                content:
                  m.content.trim().length > 0
                    ? m.content
                    : 'Esta respuesta se interrumpió al recargar la página. Vuelve a preguntar o toca «Volver a generar».',
              }
            : {}),
        };
      }),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * 🔴 Ya NO se borra todo cada día.
 *
 * El reset diario dejaba «no tienes conversaciones» en la pantalla mientras el
 * servidor sí conservaba la memoria del operador: la UI olvidaba y el modelo
 * recordaba, así que el historial dejaba de ser un historial. Ahora sólo se
 * limpia por cambio de versión del esquema, y las conversaciones viejas se
 * podan por antigüedad para que el `localStorage` no crezca sin techo.
 */
export const RETENCION_CONVERSACIONES_DIAS = 30;

/** Descarta las conversaciones sin actividad en los últimos N días. */
export function podarConversacionesViejas(
  conversaciones: Conversation[],
  ahora: Date = new Date(),
): Conversation[] {
  const corte = ahora.getTime() - RETENCION_CONVERSACIONES_DIAS * 24 * 60 * 60 * 1000;
  return conversaciones.filter((c) => {
    const t = c.updatedAt instanceof Date ? c.updatedAt.getTime() : new Date(c.updatedAt).getTime();
    return Number.isNaN(t) || t >= corte;
  });
}

function loadFromStorage(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    // Se limpia SÓLO cuando cambia la versión del esquema guardado (migración).
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== String(CURRENT_STORAGE_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
      // La marca del día ya no gobierna nada; se borra para no dejar basura.
      localStorage.removeItem(DAILY_RESET_KEY);
      return [];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return podarConversacionesViejas(deserializeConversations(stored));
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, serializeConversations(conversations));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ============================================================================
// Preferences Persistence
// ============================================================================

function loadPreferencesFromStorage(): BetaPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return JSON.parse(stored) as BetaPreferences;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferencesToStorage(prefs: BetaPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ============================================================================
// Hook Return Type
// ============================================================================

/** A decision entry with context about its source conversation */
export interface DecisionEntry {
  decision: PendingDecision;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
}

/** An agent activity entry with context about its source conversation */
export interface AgentActivityEntry {
  activity: AgentActivityBlock;
  conversationId: string;
  conversationTitle: string;
}

export interface UseBetaChatReturn {
  // Loading state (false in mock, true during real API fetch)
  isLoading: boolean;

  // Current conversation
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isThinking: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Agent execution
  activeAgentBlock: AgentActivityBlock | null;
  isAgentsRunning: boolean;
  /**
   * Los pasos del turno EN CURSO, en orden. Se arman con los eventos del
   * stream, así que el plan cambia según lo que el asistente hace de verdad.
   * Vacío cuando no hay un turno corriendo.
   */
  turnSteps: TurnStep[];
  retryAgent: (executionId: string) => void;

  // Decision handling
  selectDecisionOption: (messageId: string, optionId: string) => void;
  pendingDecisionsCount: number;
  allDecisions: DecisionEntry[];

  // Agent activity aggregation
  allAgentActivities: AgentActivityEntry[];

  // Message actions (acciones bajo cada respuesta)
  regenerateResponse: (assistantMessageId: string) => void;
  rateMessage: (messageId: string, rating: 'up' | 'down') => void;

  // Conversation management
  conversations: Conversation[];
  activeConversationId: string | null;
  createConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSummaries: ConversationSummary[];

  // Briefing
  currentBriefing: DailyBriefing | null;
  sendBriefingAction: (sectionId: string, context: string) => void;
  hasNewBriefing: boolean;
  markBriefingSeen: () => void;
  briefings: DailyBriefing[];
  selectedBriefing: DailyBriefing | null;
  selectBriefing: (id: string) => void;

  // Preferences
  preferences: BetaPreferences;
  updatePreferences: (partial: Partial<BetaPreferences>) => void;
  resetPreferences: () => void;

  // Action proposals (F5 — human-in-the-loop confirmations)
  confirmActionProposal: (messageId: string, workItemId: string, reason?: string) => Promise<void>;
  discardActionProposal: (messageId: string, workItemId: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

export interface UseBetaChatOptions {
  onTabChange?: (tab: string) => void;
}

export function useBetaChat(options?: UseBetaChatOptions): UseBetaChatReturn {
  // Stable ref for onTabChange callback to avoid re-render cascades
  const onTabChangeRef = useRef(options?.onTabChange);
  onTabChangeRef.current = options?.onTabChange;

  // Agency tenant for the AI chat backend calls (F2). Null outside the agency
  // layout → sendMessage degrades to an honest error.
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;

  // Initialize from localStorage (only on client)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadFromStorage();
    return stored.length > 0 ? stored : [createEmptyConversation()];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored.length > 0 ? stored[0].id : null;
  });

  // Streaming state
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Agent execution state
  const [activeAgentBlock, setActiveAgentBlock] = useState<AgentActivityBlock | null>(null);
  const [isAgentsRunning, setIsAgentsRunning] = useState(false);

  // ── Pasos del turno ──────────────────────────────────────────────────────
  // El plan que se ve en «Progreso de la tarea». No es una lista fija: se
  // construye con los eventos del stream (snapshot → despachos → redacción),
  // por eso una pregunta de cartera y una cotización muestran pasos distintos.
  // El ref existe porque las callbacks del stream leen el estado anterior y
  // React no lo tiene actualizado dentro del mismo tick.
  const [turnSteps, setTurnSteps] = useState<TurnStep[]>([]);
  const turnStepsRef = useRef<TurnStep[]>([]);

  const aplicarPasos = useCallback((next: TurnStep[]) => {
    turnStepsRef.current = next;
    setTurnSteps(next);
  }, []);

  const parchearPaso = useCallback(
    (id: string, patch: Partial<TurnStep>) => {
      aplicarPasos(turnStepsRef.current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [aplicarPasos]
  );

  /** Inserta un paso REAL antes de «redactar», que siempre va al final. */
  const insertarPaso = useCallback(
    (step: TurnStep) => {
      const actuales = turnStepsRef.current;
      const i = actuales.findIndex((p) => p.kind === 'redactar');
      const next = i === -1 ? [...actuales, step] : [...actuales.slice(0, i), step, ...actuales.slice(i)];
      aplicarPasos(next);
    },
    [aplicarPasos]
  );

  /** Cierra el turno: lo que quedó corriendo se da por hecho, y se limpia. */
  const cerrarPasos = useCallback(
    (comoFallo?: string) => {
      const ahora = new Date();
      aplicarPasos(
        turnStepsRef.current.map((p) =>
          p.status === 'running' || p.status === 'pending'
            ? {
                ...p,
                status: comoFallo ? ('failed' as const) : ('done' as const),
                ...(comoFallo && p.status === 'running' ? { detail: comoFallo } : {}),
                completedAt: ahora,
              }
            : p
        )
      );
    },
    [aplicarPasos]
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Briefing state. Starts empty and is populated by the real GET /ai-hub/briefing
  // payload when the backend answers (effect further down).
  const [currentBriefing, setCurrentBriefing] = useState<DailyBriefing | null>(null);
  const [hasNewBriefing, setHasNewBriefing] = useState(false);
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<BetaPreferences>(() => loadPreferencesFromStorage());

  // Timeout refs
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);
  const agentTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Store pending streaming params for use after agent completion
  const pendingStreamRef = useRef<{
    assistantId: string;
    responseText: string;
    conversationId: string;
  } | null>(null);

  // Store pending decision to attach after streaming completes
  const pendingDecisionRef = useRef<import('@/lib/types/beta-chat').PendingDecision | null>(null);

  // Store pending response meta to attach after streaming completes
  const pendingResponseMetaRef = useRef<import('@/lib/types/beta-chat').ResponseMeta | null>(null);

  // Sync activeConversationId on init when state initializers may differ
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  // Real daily briefing (F4): fetch GET /ai-hub/briefing once the agency is
  // known. fetchBriefing never throws and resolves `null` on 404/error/unusable
  // payload — in that case we keep the mock briefing already in state, so the
  // chat home works with or without the backend (fail-open).
  useEffect(() => {
    if (!agencyId || !isAgentConfigured()) return;
    const controller = new AbortController();
    void fetchBriefing({ agencyId, signal: controller.signal }).then((real) => {
      if (!real || controller.signal.aborted) return;
      setCurrentBriefing(real);
      // Once real data exists, showing mock "history" next to it would be
      // dishonest — the history list becomes just today's real briefing.
      setBriefings([real]);
      setSelectedBriefingId(null);
      setHasNewBriefing(true);
    });
    return () => controller.abort();
  }, [agencyId]);

  // Active conversation messages
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  /**
   * 🔴 Controlador del turno EN VUELO.
   *
   * Sin esto, cambiar/terminar/borrar la conversación sólo limpiaba los
   * timeouts: el `fetch` del stream seguía vivo y sus handlers volvían a
   * prender `isAgentsRunning` y `isStreaming` — la conversación NUEVA quedaba
   * con el compositor bloqueado mientras la vieja se tecleaba invisible, y la
   * aprobación pendiente del turno abortado se perdía.
   */
  const abortRef = useRef<AbortController | null>(null);

  /** Qué se está tecleando y hasta dónde, para que el `done` continúe en vez de reiniciar. */
  const streamingTargetRef = useRef<{ assistantId: string; text: string } | null>(null);

  // Cleanup all timeouts
  const clearTimeouts = useCallback(() => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    if (charTimeoutRef.current) {
      clearTimeout(charTimeoutRef.current);
      charTimeoutRef.current = null;
    }
    agentTimeoutsRef.current.forEach(clearTimeout);
    agentTimeoutsRef.current = [];
  }, []);

  /**
   * Corta el turno en vuelo y deja la UI en un estado limpio. Abortar es
   * INTENCIONAL: el turno abortado no pinta error ni cae al respaldo POST.
   */
  const abortarTurnoEnCurso = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimeouts();
    streamingTargetRef.current = null;
    charIndexRef.current = 0;
    pendingDecisionRef.current = null;
    pendingResponseMetaRef.current = null;
    setIsThinking(false);
    setIsStreaming(false);
    setStreamingContent('');
    setActiveAgentBlock(null);
    setIsAgentsRunning(false);
    aplicarPasos([]);
  }, [clearTimeouts, aplicarPasos]);

  const getCharDelay = useCallback((char: string): number => {
    const baseInterval = 1000 / CHARS_PER_SECOND;
    if (LONG_PAUSE_CHARS.has(char)) return baseInterval * LONG_PAUSE_MULTIPLIER;
    if (SHORT_PAUSE_CHARS.has(char)) return baseInterval * SHORT_PAUSE_MULTIPLIER;
    return baseInterval;
  }, []);

  // ========================================================================
  // Start streaming response (reusable — called after agents complete or directly)
  // ========================================================================

  const startStreaming = useCallback(
    (
      assistantId: string,
      responseText: string,
      conversationId: string,
      opts: { parcial?: boolean } = {}
    ) => {
      // 🔴 El texto se muestra EN CUANTO LLEGA el evento `message`, no al
      // `done`. El micro manda la respuesta completa antes de despachar; el
      // front la escondía hasta el cierre del stream y el operador veía 25 s de
      // pantalla muerta y después todo el texto de golpe.
      //
      // `parcial` = esta pasada es la del evento `message` y el turno sigue
      // vivo: al terminar de escribirse NO se cierran los pasos ni se apaga
      // `isStreaming` (falta el `done`, que puede traer los resúmenes de los
      // despachos). La pasada final CONTINÚA desde donde quedó ésta en vez de
      // reiniciar el tecleo, así el texto no parpadea ni se repite.
      const parcial = opts.parcial === true;
      const previo = streamingTargetRef.current;
      const continua =
        previo !== null &&
        previo.assistantId === assistantId &&
        charIndexRef.current > 0 &&
        responseText.startsWith(previo.text.slice(0, charIndexRef.current));
      if (charTimeoutRef.current) {
        clearTimeout(charTimeoutRef.current);
        charTimeoutRef.current = null;
      }
      streamingTargetRef.current = { assistantId, text: responseText };
      charIndexRef.current = continua ? charIndexRef.current : 0;
      if (!continua) setStreamingContent('');
      setIsThinking(false);
      setIsStreaming(true);
      parchearPaso('redactar', { status: 'running', startedAt: new Date() });

      // Update status to streaming
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId ? { ...m, status: 'streaming' as MessageStatus } : m
            ),
          };
        })
      );

      const revealNextChar = () => {
        if (charIndexRef.current >= responseText.length) {
          if (parcial) {
            // El texto ya está a la vista; el turno sigue. El cierre real lo
            // hace la pasada final, cuando llega `done`.
            charTimeoutRef.current = null;
            setStreamingContent(responseText);
            return;
          }
          // Complete — attach pending decision and response meta
          const decision = pendingDecisionRef.current;
          pendingDecisionRef.current = null;
          const responseMeta = pendingResponseMetaRef.current;
          pendingResponseMetaRef.current = null;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== conversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: responseText,
                        status: 'complete' as MessageStatus,
                        ...(decision ? { decision } : {}),
                        ...(responseMeta ? { responseMeta } : {}),
                      }
                    : m
                ),
                updatedAt: new Date(),
              };
            })
          );
          setIsStreaming(false);
          setStreamingContent('');
          charTimeoutRef.current = null;
          streamingTargetRef.current = null;
          cerrarPasos();
          aplicarPasos([]);
          return;
        }

        const currentChar = responseText[charIndexRef.current];
        charIndexRef.current += 1;
        const partial = responseText.slice(0, charIndexRef.current);
        setStreamingContent(partial);

        const delay = getCharDelay(currentChar);
        charTimeoutRef.current = setTimeout(revealNextChar, delay);
      };

      revealNextChar();
    },
    [getCharDelay, parchearPaso, cerrarPasos, aplicarPasos]
  );

  // ========================================================================
  // F2 backend wiring — turn helpers (replace the mock agent simulation)
  // ========================================================================

  /** Set the response-card metadata on the assistant message (so ResponseCard renders). */
  const attachResponseMeta = useCallback(
    (assistantId: string, conversationId: string, responseMeta: ResponseMeta) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, responseMeta } : m
                ),
              }
        )
      );
    },
    []
  );

  /** Finalize the assistant message with an honest error (never leaves it 'sending'). */
  const finalizeError = useCallback(
    (assistantId: string, conversationId: string, message: string) => {
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
      // El turno se cortó: lo que estaba corriendo NO se puede dar por hecho.
      aplicarPasos([]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: message, status: 'complete' as MessageStatus }
                    : m
                ),
                updatedAt: new Date(),
              }
        )
      );
    },
    [clearTimeouts, aplicarPasos]
  );

  /**
   * Drive the agent-activity block from REAL backend dispatches: show the
   * specialists "running" briefly (live indicator), settle to their real
   * terminal status, attach the block + responseMeta to the message, then
   * stream the answer. Deterministic — the specialists already ran server-side.
   */
  const driveAgentBlock = useCallback(
    (
      dispatches: BackendDispatch[],
      assistantId: string,
      responseText: string,
      conversationId: string,
      responseMeta: ResponseMeta
    ) => {
      const startedAt = new Date();
      const running: AgentExecution[] = dispatches.map((d) => ({
        id: generateId(),
        agentType: backendAgentToFrontType(d.agent),
        taskDescription: d.taskDescription,
        status: 'running' as AgentExecutionStatus,
        startedAt,
      }));
      const block: AgentActivityBlock = {
        id: generateId(),
        messageId: assistantId,
        agents: running,
        startedAt,
      };

      setIsThinking(false);
      setActiveAgentBlock(block);
      setIsAgentsRunning(true);
      pendingStreamRef.current = { assistantId, responseText, conversationId };

      const settle = setTimeout(() => {
        // Preserve each running exec's id; apply the real terminal status.
        const terminal: AgentExecution[] = running.map((r, i) => {
          const d = dispatches[i];
          return {
            ...r,
            status: (d.status === 'failed' ? 'failed' : 'completed') as AgentExecutionStatus,
            completedAt: new Date(),
            ...(d.status === 'failed' ? { error: d.summary } : {}),
          };
        });
        const completedBlock: AgentActivityBlock = { ...block, agents: terminal };
        setActiveAgentBlock(completedBlock);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentActivity: completedBlock, responseMeta }
                      : m
                  ),
                }
          )
        );
        setIsAgentsRunning(false);

        const toStream = setTimeout(() => {
          setActiveAgentBlock(null);
          if (pendingStreamRef.current) {
            startStreaming(
              pendingStreamRef.current.assistantId,
              pendingStreamRef.current.responseText,
              pendingStreamRef.current.conversationId
            );
            pendingStreamRef.current = null;
          }
        }, 400);
        agentTimeoutsRef.current.push(toStream);
      }, 600);
      agentTimeoutsRef.current.push(settle);
    },
    [startStreaming]
  );

  // ========================================================================
  // Retry failed agent
  // ========================================================================

  const retryAgent = useCallback(
    (executionId: string) => {
      setActiveAgentBlock((prev) => {
        if (!prev) return prev;
        const agent = prev.agents.find((a) => a.id === executionId);
        if (!agent || agent.status !== 'failed') return prev;

        // Reset to running
        const updated = {
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === executionId
              ? { ...a, status: 'running' as AgentExecutionStatus, error: undefined, completedAt: undefined, durationMs: undefined }
              : a
          ),
        };

        // Simulate retry completing after 1-2s
        const retryDuration = 1000 + Math.random() * 1000;
        const retryTimeout = setTimeout(() => {
          setActiveAgentBlock((current) => {
            if (!current) return current;
            return {
              ...current,
              agents: current.agents.map((a) =>
                a.id === executionId
                  ? {
                      ...a,
                      status: 'completed' as AgentExecutionStatus,
                      completedAt: new Date(),
                      durationMs: Math.round(retryDuration),
                      error: undefined,
                    }
                  : a
              ),
            };
          });

          // Check if all agents are now complete after retry
          setTimeout(() => {
            setActiveAgentBlock((current) => {
              if (!current) return current;
              const allDone = current.agents.every(
                (a) => a.status === 'completed' || a.status === 'failed'
              );
              if (allDone && !current.agents.some((a) => a.status === 'failed')) {
                // All complete, no failures — attach to message and start streaming
                if (pendingStreamRef.current) {
                  const { assistantId, conversationId } = pendingStreamRef.current;
                  setConversations((prevConvs) =>
                    prevConvs.map((c) => {
                      if (c.id !== conversationId) return c;
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId ? { ...m, agentActivity: current } : m
                        ),
                      };
                    })
                  );
                  setIsAgentsRunning(false);
                  const streamDelay = setTimeout(() => {
                    setActiveAgentBlock(null);
                    if (pendingStreamRef.current) {
                      startStreaming(
                        pendingStreamRef.current.assistantId,
                        pendingStreamRef.current.responseText,
                        pendingStreamRef.current.conversationId
                      );
                      pendingStreamRef.current = null;
                    }
                  }, 400);
                  agentTimeoutsRef.current.push(streamDelay);
                }
              }
              return current;
            });
          }, 100);
        }, retryDuration);
        agentTimeoutsRef.current.push(retryTimeout);

        return updated;
      });
    },
    [startStreaming]
  );

  // ========================================================================
  // Finish a turn — shared by the SSE path and the one-shot POST fallback.
  // When the SSE path already animated dispatches live, `liveBlock` carries
  // that block so we settle it instead of re-simulating with driveAgentBlock.
  // ========================================================================

  const finishTurn = useCallback(
    (
      resp: {
        responseText: string;
        suggestedActions: BackendSuggestedAction[];
        dispatches: BackendDispatch[];
        snapshot?: ChatSnapshot | null;
        /**
         * 🔴 Sólo llega por el camino de respaldo POST: en el stream la
         * aprobación viene por su propio evento (`onPendingApproval`) y ya
         * quedó en `pendingDecisionRef`. Acá se convierte con LA MISMA función,
         * para que las dos rutas pinten la misma `<DecisionCard>`.
         */
        pendingApprovals?: BackendPendingApproval[];
      },
      assistantId: string,
      conversationId: string,
      liveBlock: AgentActivityBlock | null
    ) => {
      // Attach the "estado de hoy" snapshot up-front. Every downstream setter
      // (live-block branch, driveAgentBlock, attachResponseMeta) spreads `...m`,
      // so this single patch survives regardless of which branch runs next.
      const snapshot = resp.snapshot ?? null;
      if (snapshot) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, snapshot } : m
                  ),
                }
          )
        );
      }

      // 🔴 Camino de respaldo POST: la aprobación pendiente llega en la
      // respuesta, no por un evento. Si el stream ya dejó una en el ref, ésa
      // manda (es la misma, y viene con el orden real de los eventos).
      const aprobacionPost = resp.pendingApprovals?.[0];
      if (!pendingDecisionRef.current && aprobacionPost) {
        pendingDecisionRef.current = aprobacionADecision(aprobacionPost);
      }

      const actions = resp.suggestedActions.map(suggestedActionToResponseAction);
      const summaries = resp.dispatches
        .map((d) => d.summary)
        .filter((s): s is string => Boolean(s));
      const fullText = [resp.responseText, ...summaries].filter(Boolean).join('\n\n');
      const responseMeta: ResponseMeta = {
        type: 'informative',
        title: 'Asistente Leasefy',
        summary: '',
        actions,
        ...(resp.dispatches[0]
          ? { primaryAgent: backendAgentToFrontType(resp.dispatches[0].agent) }
          : {}),
      };
      pendingResponseMetaRef.current = responseMeta;

      if (liveBlock && liveBlock.agents.length > 0) {
        // The stream already showed the dispatches live — settle any straggler
        // still "running", attach the block to the message, then stream the text.
        const terminal: AgentExecution[] = liveBlock.agents.map((a) =>
          a.status === 'running'
            ? {
                ...a,
                status: 'completed' as AgentExecutionStatus,
                completedAt: new Date(),
              }
            : a
        );
        const completedBlock: AgentActivityBlock = { ...liveBlock, agents: terminal };
        setActiveAgentBlock(completedBlock);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentActivity: completedBlock, responseMeta }
                      : m
                  ),
                }
          )
        );
        setIsAgentsRunning(false);
        const toStream = setTimeout(() => {
          setActiveAgentBlock(null);
          startStreaming(assistantId, fullText, conversationId);
        }, 400);
        agentTimeoutsRef.current.push(toStream);
      } else if (resp.dispatches.length > 0) {
        driveAgentBlock(resp.dispatches, assistantId, fullText, conversationId, responseMeta);
      } else {
        attachResponseMeta(assistantId, conversationId, responseMeta);
        setIsThinking(false);
        startStreaming(assistantId, fullText, conversationId);
      }
    },
    [startStreaming, driveAgentBlock, attachResponseMeta]
  );

  // ========================================================================
  // F2c — streaming turn over SSE. Drives the agent-activity block LIVE from
  // dispatch_start/dispatch_result events while the stream is open, then
  // resolves with the final response pieces (from `done`, falling back to the
  // accumulated `message` event). Throws when the stream fails or yields
  // nothing usable — the caller falls back to the one-shot POST.
  // ========================================================================

  const runStreamTurn = useCallback(
    async (args: {
      agencyId: string;
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      assistantId: string;
      conversationId: string;
      /** 🔴 Corta el `fetch` cuando el operador cambia de conversación. */
      signal: AbortSignal;
    }): Promise<{
      responseText: string;
      suggestedActions: BackendSuggestedAction[];
      dispatches: BackendDispatch[];
      snapshot: ChatSnapshot | null;
      liveBlock: AgentActivityBlock | null;
    }> => {
      const startedAt = new Date();
      let liveBlock: AgentActivityBlock | null = null;
      let messageText = '';
      let messageActions: BackendSuggestedAction[] = [];
      const resultDispatches: BackendDispatch[] = [];
      // Object holder (not bare `let`s): assignments happen inside the stream
      // callbacks, where TS control-flow narrowing would otherwise pin the
      // outer reads to the initializer type.
      const collected: {
        final: {
          responseText: string;
          suggestedActions: BackendSuggestedAction[];
          dispatches: BackendDispatch[];
        } | null;
        snapshot: ChatSnapshot | null;
        streamError: string | null;
      } = { final: null, snapshot: null, streamError: null };

      await streamChatTurn({
        agencyId: args.agencyId,
        message: args.message,
        history: args.history,
        signal: args.signal,
        handlers: {
          onSnapshot: (s) => {
            collected.snapshot = backendSnapshotToChat(s);
            // El snapshot es la PRIMERA prueba de que el backend ya leyó el
            // estado de la agencia: cierra «entender» y llena el paso de
            // cartera con las cifras que de verdad llegaron.
            const ahora = new Date();
            parchearPaso('entender', { status: 'done', completedAt: ahora });
            parchearPaso(
              'cartera',
              s
                ? {
                    status: 'done',
                    completedAt: ahora,
                    detailKey: 'beta.tasks.detail.cartera',
                    detailVars: {
                      deudores: s.deudoresActivos,
                      escalaciones: s.escalacionesPendientes,
                      prejuridico: s.enPrejuridico,
                    },
                  }
                : { status: 'done', completedAt: ahora, detailKey: 'beta.tasks.detail.carteraVacia' }
            );
          },
          onMessage: (text, actions) => {
            messageText = text;
            messageActions = actions;
            // Llegó texto: el orquestador ya decidió y está escribiendo. Si
            // todavía no se había cerrado «entender» (agencia sin snapshot),
            // se cierra acá.
            const ahora = new Date();
            if (turnStepsRef.current.some((p) => p.id === 'entender' && p.status === 'running')) {
              parchearPaso('entender', { status: 'done', completedAt: ahora });
            }
            // 🔴 Y se MUESTRA ya. Antes se guardaba en `messageText` y no se
            // pintaba hasta el `done`: el texto existía y el operador miraba
            // una pantalla muerta.
            if (text) {
              startStreaming(args.assistantId, text, args.conversationId, { parcial: true });
            }
          },
          onDispatchStart: (agent, taskDescription) => {
            const exec: AgentExecution = {
              id: generateId(),
              agentType: backendAgentToFrontType(agent),
              taskDescription,
              status: 'running' as AgentExecutionStatus,
              startedAt: new Date(),
            };
            liveBlock = liveBlock
              ? { ...liveBlock, agents: [...liveBlock.agents, exec] }
              : {
                  id: generateId(),
                  messageId: args.assistantId,
                  agents: [exec],
                  startedAt,
                };
            setIsThinking(false);
            setIsAgentsRunning(true);
            setActiveAgentBlock(liveBlock);
            // Cada despacho es un paso propio, con la tarea que escribió el
            // orquestador. Acá es donde el plan deja de ser genérico: dos
            // preguntas distintas despachan agentes distintos.
            insertarPaso({
              id: exec.id,
              kind: 'agente',
              // Título corto arriba y la tarea REAL como sub-línea: el
              // orquestador escribe un párrafo entero como `taskDescription`
              // (verificado en vivo: cinco renglones), y de título no se lee.
              labelKey: 'beta.tasks.plan.consultAgent',
              detail: taskDescription,
              agentType: exec.agentType,
              status: 'running',
              startedAt: exec.startedAt,
            });
          },
          onDispatchResult: (dispatch) => {
            resultDispatches.push(dispatch);
            if (!liveBlock) return;
            const agentType = backendAgentToFrontType(dispatch.agent);
            let settled = false;
            const agents = liveBlock.agents.map((a) => {
              if (settled || a.status !== 'running' || a.agentType !== agentType) {
                return a;
              }
              settled = true;
              return {
                ...a,
                status: (dispatch.status === 'failed'
                  ? 'failed'
                  : 'completed') as AgentExecutionStatus,
                completedAt: new Date(),
                ...(dispatch.status === 'failed' ? { error: dispatch.summary } : {}),
              };
            });
            liveBlock = { ...liveBlock, agents };
            setActiveAgentBlock(liveBlock);
            // El paso se cierra con lo que el agente EFECTIVAMENTE respondió:
            // su resumen, y el siguiente paso que propone si lo trae.
            const cerrado = agents.find((x) => x.status !== 'running' && x.agentType === agentType);
            if (cerrado) {
              const detalle = [dispatch.summary, dispatch.nextStep].filter(Boolean).join(' · ');
              parchearPaso(cerrado.id, {
                status: dispatch.status === 'failed' ? 'failed' : 'done',
                completedAt: new Date(),
                ...(detalle ? { detail: detalle } : {}),
              });
            }
          },
          // Pasos internos del especialista: cada herramienta que ejecutó de
          // verdad. Se cuelgan del agente que los produjo, y el paso anterior
          // se cierra al llegar el siguiente — el backend avisa cuando una
          // herramienta TERMINÓ, así que el que está en curso es siempre el
          // último que llegó.
          onToolStep: ({ tool, label }) => {
            // Llega cuando la herramienta YA se ejecutó (Mastra avisa al cerrar
            // el paso), así que nace en «hecho». Sin reloj: no sabemos cuánto
            // tardó cada una por separado, y un 0:00 al lado sería inventarlo.
            const actuales = turnStepsRef.current;
            const previos = actuales.filter((p) => p.kind === 'herramienta');
            const ultimo = previos[previos.length - 1];
            if (ultimo && ultimo.label === label) {
              parchearPaso(ultimo.id, { repeticiones: (ultimo.repeticiones ?? 1) + 1 });
              return;
            }
            insertarPaso({
              id: `tool-${tool}-${previos.length}`,
              kind: 'herramienta',
              label,
              status: 'done',
            });
          },
          // Acción vinculante propuesta por un especialista. Se convierte en la
          // tarjeta de decisión que ya existe; `pendingDecisionRef` la adjunta
          // al mensaje cuando termina de escribirse, igual que cualquier otra.
          onPendingApproval: (approval: BackendPendingApproval) => {
            pendingDecisionRef.current = aprobacionADecision(approval);
          },
          // F5: action_proposal events — append to the assistant message (D-42-03 fail-open).
          onActionProposal: (proposal: BackendActionProposal) => {
            try {
              const frontProposal: ActionProposal = {
                workItemId: proposal.workItemId,
                colaType: proposal.colaType,
                action: proposal.action,
                resumen: proposal.resumen,
                requiresConfirmation: true,
                status: 'pending',
              };
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== args.conversationId) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m) => {
                      if (m.id !== args.assistantId) return m;
                      const existing = m.actionProposals ?? [];
                      // Deduplicate by workItemId (stream may re-send).
                      if (existing.some((p) => p.workItemId === proposal.workItemId)) return m;
                      return { ...m, actionProposals: [...existing, frontProposal] };
                    }),
                  };
                })
              );
            } catch {
              // Fail-open: never crash the stream.
              console.warn('[useBetaChat] failed to apply action_proposal, ignored');
            }
          },
          onDone: (f) => {
            collected.final = {
              responseText: f.responseText,
              suggestedActions: f.suggestedActions,
              dispatches: f.dispatches,
            };
          },
          onError: (message) => {
            collected.streamError = message;
          },
        },
      });

      const { final, streamError } = collected;
      if (streamError && !final) throw new Error(streamError);
      const responseText = final?.responseText || messageText;
      const dispatches =
        final && final.dispatches.length > 0 ? final.dispatches : resultDispatches;
      const suggestedActions =
        final && final.suggestedActions.length > 0
          ? final.suggestedActions
          : messageActions;
      if (!responseText && dispatches.length === 0) {
        throw new Error('empty stream');
      }
      return {
        responseText,
        suggestedActions,
        dispatches,
        snapshot: collected.snapshot,
        liveBlock,
      };
    },
    [parchearPaso, insertarPaso, startStreaming]
  );

  // ========================================================================
  // Send message — real AI chat backend, SSE-first (F2c):
  //   stream → (on failure) one-shot POST → (on failure) honest error.
  //   No backend configured / no agency → mock fallback seam.
  // ========================================================================

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking || isStreaming || isAgentsRunning || !activeConversationId) return;

      const conversationId = activeConversationId;
      const activeConv = conversations.find((c) => c.id === conversationId);
      // History from prior turns (completed), oldest→newest, capped at 10. Sent
      // as a fallback; the backend prefers its own server-side memory when set.
      const history = (activeConv?.messages ?? [])
        .filter(
          (m) =>
            (m.role === 'user' && m.content) ||
            (m.role === 'assistant' && m.status === 'complete' && m.content)
        )
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        status: 'sent',
      };
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      };

      // Update conversation with new messages + auto-title
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const isFirstMessage = c.messages.length === 0;
          return {
            ...c,
            title: isFirstMessage ? generateTitle(trimmed) : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
            updatedAt: new Date(),
          };
        })
      );

      setIsThinking(true);
      setStreamingContent('');
      pendingDecisionRef.current = null;
      pendingResponseMetaRef.current = null;

      // Plan inicial del turno. Sólo dos pasos son ciertos ANTES de que el
      // backend hable: leer la pregunta y responder. Todo lo del medio lo
      // agregan los eventos del stream, que es lo que lo hace contextual.
      aplicarPasos([
        {
          id: 'entender',
          kind: 'entender',
          labelKey: 'beta.tasks.plan.understand',
          detail: trimmed,
          status: 'running',
          startedAt: new Date(),
        },
        { id: 'cartera', kind: 'cartera', labelKey: 'beta.tasks.plan.snapshot', status: 'pending' },
        { id: 'redactar', kind: 'redactar', labelKey: 'beta.tasks.plan.write', status: 'pending' },
      ]);

      // No agent configured — fail visibly
      if (!agencyId || !isAgentConfigured()) {
        finalizeError(
          assistantId,
          conversationId,
          'El asistente de IA no está disponible (agente no configurado).'
        );
        return;
      }

      // 🔴 Un controlador POR TURNO: cambiar de conversación lo aborta y con él
      // se van el fetch, los handlers y las banderas globales.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      void (async () => {
        try {
          // F2c: SSE first — live dispatch indicators + lower perceived latency.
          const streamed = await runStreamTurn({
            agencyId,
            message: trimmed,
            history,
            assistantId,
            conversationId,
            signal,
          });
          if (signal.aborted) return;
          finishTurn(streamed, assistantId, conversationId, streamed.liveBlock);
        } catch {
          // Abortar es intencional: ni respaldo POST ni cartel de error.
          if (signal.aborted) return;
          // Stream failed (route missing, proxy buffering, mid-stream drop) →
          // clear any partial live UI and fall back to the one-shot POST.
          setActiveAgentBlock(null);
          setIsAgentsRunning(false);
          try {
            const resp = await postChatTurn({ agencyId, message: trimmed, history, signal });
            if (signal.aborted) return;
            finishTurn(resp, assistantId, conversationId, null);
          } catch {
            if (signal.aborted) return;
            finalizeError(
              assistantId,
              conversationId,
              'No pude conectarme con el asistente en este momento. Intenta de nuevo en un momento.'
            );
          }
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
        }
      })();
    },
    [
      isThinking,
      isStreaming,
      isAgentsRunning,
      activeConversationId,
      conversations,
      agencyId,
      runStreamTurn,
      finishTurn,
      finalizeError,
      aplicarPasos,
    ]
  );

  // ========================================================================
  // Message actions
  // ========================================================================

  /**
   * Pedido de regeneración en vuelo.
   *
   * No se puede recortar la conversación y llamar a `sendMessage` en el mismo
   * tick: `sendMessage` está memoizado sobre `conversations` y arma el
   * historial desde ese valor, así que la versión que tengo en la mano todavía
   * incluye los mensajes que acabo de quitar — y el modelo recibiría de
   * historial la respuesta que estamos rehaciendo. El efecto de abajo dispara
   * cuando el estado recortado ya aterrizó.
   */
  const regeneracionPendienteRef = useRef<string | null>(null);

  /**
   * Rehace la última respuesta del asistente.
   *
   * Recorta desde el mensaje del usuario que la originó (inclusive) y lo vuelve
   * a enviar: así el turno se rehace entero por el mismo camino que cualquier
   * otro (SSE con respaldo POST), sin duplicar la lógica de red.
   */
  const regenerateResponse = useCallback(
    (assistantMessageId: string) => {
      if (isThinking || isStreaming || isAgentsRunning || !activeConversationId) return;
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (!conv) return;

      const idx = conv.messages.findIndex((m) => m.id === assistantMessageId);
      if (idx < 1) return;

      // El mensaje de usuario más cercano hacia atrás. Se busca en vez de
      // asumir `idx - 1` porque entre medio puede haber bloques de sistema.
      let u = idx - 1;
      while (u >= 0 && conv.messages[u].role !== 'user') u -= 1;
      if (u < 0) return;

      const texto = conv.messages[u].content;
      if (!texto.trim()) return;

      const conversationId = activeConversationId;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: c.messages.slice(0, u), updatedAt: new Date() }
            : c
        )
      );
      regeneracionPendienteRef.current = texto;
    },
    [isThinking, isStreaming, isAgentsRunning, activeConversationId, conversations]
  );

  /** Marca el pulgar. Volver a tocar el mismo pulgar lo quita. */
  const rateMessage = useCallback(
    (messageId: string, rating: 'up' | 'down') => {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, feedback: m.feedback === rating ? null : rating } : m
          ),
        }))
      );
    },
    []
  );

  useEffect(() => {
    const texto = regeneracionPendienteRef.current;
    if (texto === null) return;
    regeneracionPendienteRef.current = null;
    sendMessage(texto);
    // Depende de `conversations` a propósito: es el cambio de ese estado (el
    // recorte) lo que habilita este envío con el historial ya correcto.
  }, [conversations, sendMessage]);

  // ========================================================================
  // Conversation CRUD
  // ========================================================================

  const createConversation = useCallback(() => {
    // Stop any in-flight streaming or agent execution
    clearTimeouts();
    setIsThinking(false);
    setIsStreaming(false);
    setStreamingContent('');
    setActiveAgentBlock(null);
    setIsAgentsRunning(false);
    pendingStreamRef.current = null;
    abortarTurnoEnCurso();

    const newConv = createEmptyConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  }, [clearTimeouts, abortarTurnoEnCurso]);

  const switchConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return;
      // Stop streaming/agents if switching mid-stream
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
      abortarTurnoEnCurso();
      setActiveConversationId(id);
      // Switch to conversations tab so the user sees the conversation
      onTabChangeRef.current?.('conversations');
    },
    [activeConversationId, clearTimeouts, abortarTurnoEnCurso]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        // If deleting the active conversation, switch to first remaining or create new
        if (id === activeConversationId) {
          if (filtered.length > 0) {
            setActiveConversationId(filtered[0].id);
          } else {
            const newConv = createEmptyConversation();
            setActiveConversationId(newConv.id);
            return [newConv];
          }
        }
        return filtered;
      });
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
      abortarTurnoEnCurso();
    },
    [activeConversationId, clearTimeouts, abortarTurnoEnCurso]
  );

  // ========================================================================
  // Decision selection
  // ========================================================================

  const selectDecisionOption = useCallback(
    (messageId: string, optionId: string) => {
      if (!activeConversationId) return;

      // Find the option label for the user response message
      let optionLabel = '';
      let aprobacion: string | undefined;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId || !m.decision) return m;
              const option = m.decision.options.find((o) => o.id === optionId);
              if (option) optionLabel = option.label;
              aprobacion = m.decision.approvalId;
              return {
                ...m,
                decision: {
                  ...m.decision,
                  selectedOptionId: optionId,
                  selectedAt: new Date(),
                },
              };
            }),
            updatedAt: new Date(),
          };
        })
      );

      // Una aprobación se REGISTRA en el backend (señal de aprendizaje) y no
      // abre otro turno: la acción no se ejecuta acá, se ejecuta en su frente,
      // así que pedirle al modelo que opine de nuevo sólo gastaría un turno.
      if (aprobacion && agencyId) {
        void resolveChatApproval({
          agencyId,
          approvalId: aprobacion,
          outcome: optionId === 'cancel' ? 'rejected' : 'approved',
        }).catch(() => {
          // Fail-soft: la tarjeta ya quedó marcada; no se rompe la conversación.
          console.warn('[useBetaChat] no se pudo registrar la decisión de aprobación');
        });
        return;
      }

      // Send a user message confirming the selection, then trigger a mock response
      if (optionLabel) {
        // Small delay so the decision card updates visually first
        setTimeout(() => {
          sendMessage(`He seleccionado: ${optionLabel}`);
        }, 300);
      }
    },
    [activeConversationId, sendMessage, agencyId]
  );

  // ========================================================================
  // Decision aggregation (across all conversations)
  // ========================================================================

  const allDecisions: DecisionEntry[] = conversations.flatMap((c) =>
    c.messages
      .filter((m): m is ChatMessage & { decision: PendingDecision } => !!m.decision)
      .map((m) => ({
        decision: m.decision,
        conversationId: c.id,
        conversationTitle: c.title,
        messageId: m.id,
      }))
  );

  const pendingDecisionsCount = allDecisions.filter(
    (d) => !d.decision.selectedOptionId
  ).length;

  // ========================================================================
  // Agent activity aggregation (across all conversations)
  // ========================================================================

  const allAgentActivities: AgentActivityEntry[] = conversations.flatMap((c) =>
    c.messages
      .filter((m): m is ChatMessage & { agentActivity: AgentActivityBlock } => !!m.agentActivity)
      .map((m) => ({
        activity: m.agentActivity,
        conversationId: c.id,
        conversationTitle: c.title,
      }))
  );

  // ========================================================================
  // Action proposals (F5)
  // ========================================================================

  /**
   * Execute a confirmed action proposal. Updates the proposal status to
   * 'confirming' → 'executed' | 'error' in conversation state.
   */
  const confirmActionProposal = useCallback(
    async (messageId: string, workItemId: string, reason?: string): Promise<void> => {
      if (!agencyId) throw new Error('No agency');

      // Mark as confirming
      const updateStatus = (
        status: ActionProposal['status'],
        extra?: Partial<ActionProposal>
      ) => {
        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId || !m.actionProposals) return m;
              return {
                ...m,
                actionProposals: m.actionProposals.map((p) =>
                  p.workItemId === workItemId ? { ...p, status, ...extra } : p
                ),
              };
            }),
          }))
        );
      };

      updateStatus('confirming');
      try {
        // Find the action from state to pass to the network call
        let action: ActionProposal['action'] | undefined;
        setConversations((prev) => {
          const msg = prev
            .flatMap((c) => c.messages)
            .find((m) => m.id === messageId);
          action = msg?.actionProposals?.find((p) => p.workItemId === workItemId)?.action;
          return prev;
        });

        if (!action) throw new Error('Proposal not found');
        await executeAction({ agencyId, workItemId, action, reason });
        updateStatus('executed', { result: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Error al ejecutar la acción';
        updateStatus('error', { error });
        throw err; // re-throw so the card can show the error (if it handles it)
      }
    },
    [agencyId]
  );

  /** Discard a proposal UI-only (no network call). */
  const discardActionProposal = useCallback(
    (messageId: string, workItemId: string) => {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== messageId || !m.actionProposals) return m;
            return {
              ...m,
              actionProposals: m.actionProposals.map((p) =>
                p.workItemId === workItemId ? { ...p, status: 'discarded' as const } : p
              ),
            };
          }),
        }))
      );
    },
    []
  );

  // ========================================================================
  // Search / Summaries
  // ========================================================================

  const filteredSummaries: ConversationSummary[] = conversations
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      if (c.title.toLowerCase().includes(query)) return true;
      return c.messages.some((m) => m.content.toLowerCase().includes(query));
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      preview: getPreview(c.messages),
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
    }));

  // ========================================================================
  // Briefing action — sends context message and switches to conversations tab
  // ========================================================================

  const sendBriefingAction = useCallback(
    (sectionId: string, context: string) => {
      // Switch to conversations tab so the user sees the response
      onTabChangeRef.current?.('conversations');
      // Ensure there's an active conversation
      if (!activeConversationId) {
        createConversation();
      }
      // Send the context message as if the user typed it
      sendMessage(context);
    },
    [activeConversationId, createConversation, sendMessage]
  );

  // ========================================================================
  // Briefing notification & history
  // ========================================================================

  const markBriefingSeen = useCallback(() => {
    setHasNewBriefing(false);
  }, []);

  const selectBriefing = useCallback((id: string) => {
    setSelectedBriefingId(id);
  }, []);

  // Computed: selected briefing defaults to today (first in array)
  const selectedBriefing = selectedBriefingId
    ? briefings.find((b) => b.id === selectedBriefingId) ?? briefings[0] ?? null
    : briefings[0] ?? null;

  // ========================================================================
  // Preferences persistence & mutations
  // ========================================================================

  // Persist preferences to localStorage whenever they change
  useEffect(() => {
    savePreferencesToStorage(preferences);
  }, [preferences]);

  const updatePreferences = useCallback((partial: Partial<BetaPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev };
      if (partial.autonomy) {
        next.autonomy = { ...prev.autonomy, ...partial.autonomy };
      }
      if (partial.notifications) {
        next.notifications = {
          ...prev.notifications,
          ...partial.notifications,
          categories: partial.notifications.categories
            ? { ...prev.notifications.categories, ...partial.notifications.categories }
            : prev.notifications.categories,
        };
      }
      if (partial.tone !== undefined) {
        next.tone = partial.tone;
      }
      if (partial.thresholds) {
        next.thresholds = { ...prev.thresholds, ...partial.thresholds };
      }
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    // Loading state (always false in mock mode; real API sets true during fetch)
    isLoading: false,

    // Current conversation
    messages,
    sendMessage,
    isThinking,
    isStreaming,
    streamingContent,

    // Agent execution
    activeAgentBlock,
    isAgentsRunning,
    turnSteps,
    retryAgent,

    // Decision handling
    selectDecisionOption,
    pendingDecisionsCount,
    allDecisions,

    // Agent activity aggregation
    allAgentActivities,

    // Message actions
    regenerateResponse,
    rateMessage,

    // Conversation management
    conversations,
    activeConversationId,
    createConversation,
    switchConversation,
    deleteConversation,

    // Search
    searchQuery,
    setSearchQuery,
    filteredSummaries,

    // Briefing
    currentBriefing,
    sendBriefingAction,
    hasNewBriefing,
    markBriefingSeen,
    briefings,
    selectedBriefing,
    selectBriefing,

    // Preferences
    preferences,
    updatePreferences,
    resetPreferences,

    // Action proposals (F5)
    confirmActionProposal,
    discardActionProposal,
  };
}
