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

/** Type of response for display routing */
export type ResponseType = 'informative' | 'actionable';

/** An action button shown on response cards */
export interface ResponseAction {
  id: string;
  label: string;
  /** Route within the app (e.g. '/panel/propiedades') */
  href?: string;
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
  /** Structured response metadata for rich card display */
  responseMeta?: ResponseMeta;
  /** "Estado de hoy" KPI snapshot from the backend (rendered as a data card). */
  snapshot?: ChatSnapshot;
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
export type AutonomyLevel = 'auto' | 'ask_first' | 'manual';

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
