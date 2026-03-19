/**
 * API request/response types for the Leasefy AI platform.
 *
 * These types define the contract between frontend and backend for all
 * AI orchestrator endpoints. Shared domain types (AgentType, PendingDecision, etc.)
 * are imported from beta-chat.ts to avoid duplication.
 *
 * See: docs/AI-AGENT-ARCHITECTURE.md Section 9 for endpoint specifications.
 */

import type {
  AgentType,
  AgentExecutionStatus,
  PendingDecision,
  DecisionOption,
  BriefingSection,
  BetaPreferences,
} from '@/lib/types/beta-chat';

// ============================================================================
// Chat / Messages
// ============================================================================

/** POST /api/v1/ai/message — Send message to orchestrator */
export interface SendMessageRequest {
  message: string;
  conversationId?: string; // null = new conversation
  attachments?: string[]; // URLs
}

/** Streaming response events (SSE) — defined here, implemented in 24-02 */
export type ChatStreamEvent =
  | { type: 'message_start'; conversationId: string; messageId: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'agent_dispatch'; agents: AgentDispatchEvent[] }
  | {
      type: 'agent_status';
      agentId: string;
      status: AgentExecutionStatus;
      durationMs?: number;
      error?: string;
    }
  | { type: 'decision'; decision: PendingDecision }
  | {
      type: 'message_complete';
      usage?: { inputTokens: number; outputTokens: number };
    }
  | { type: 'error'; code: string; message: string };

/** An agent dispatched by the orchestrator during a chat response */
export interface AgentDispatchEvent {
  id: string;
  agentType: AgentType;
  taskDescription: string;
}

// ============================================================================
// Conversations
// ============================================================================

/** GET /api/v1/ai/conversations */
export interface ConversationsListResponse {
  conversations: ApiConversation[];
  total: number;
}

/** Lightweight conversation summary returned by list endpoint */
export interface ApiConversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** GET /api/v1/ai/conversations/:id */
export interface ConversationDetailResponse {
  id: string;
  title: string;
  messages: ApiMessage[];
  createdAt: string;
  updatedAt: string;
}

/** A single message in a conversation detail response */
export interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentActivity?: { agents: AgentDispatchEvent[] };
  decision?: PendingDecision;
  createdAt: string;
}

/** POST /api/v1/ai/conversations — Create new */
export interface CreateConversationResponse {
  id: string;
  title: string;
  createdAt: string;
}

// ============================================================================
// Decisions
// ============================================================================

/** GET /api/v1/ai/decisions */
export interface DecisionsListResponse {
  decisions: ApiDecisionEntry[];
  pendingCount: number;
}

/** A decision entry with resolution status */
export interface ApiDecisionEntry {
  id: string;
  title: string;
  description: string;
  category: AgentType;
  options: DecisionOption[];
  selectedOptionId?: string;
  selectedAt?: string;
  conversationId: string;
  createdAt: string;
}

/** POST /api/v1/ai/decisions/:id/select */
export interface SelectDecisionRequest {
  optionId: string;
  additionalContext?: string;
}

/** Response after selecting a decision option */
export interface SelectDecisionResponse {
  status: 'accepted' | 'executing';
  actionsTriggered: string[];
}

// ============================================================================
// Briefings
// ============================================================================

/** GET /api/v1/ai/briefings */
export interface BriefingsListResponse {
  briefings: ApiBriefing[];
}

/** A briefing as returned by the API */
export interface ApiBriefing {
  id: string;
  type: 'daily' | 'weekly' | 'alert';
  date: string;
  greeting: string;
  overallSummary: string;
  sections: BriefingSection[];
  isNew: boolean;
  createdAt: string;
}

/** GET /api/v1/ai/briefings/latest */
export type LatestBriefingResponse = ApiBriefing;

// ============================================================================
// Preferences
// ============================================================================

/** GET /api/v1/ai/preferences */
export type PreferencesResponse = BetaPreferences;

/** PUT /api/v1/ai/preferences */
export type UpdatePreferencesRequest = Partial<BetaPreferences>;

/** Response after updating preferences */
export type UpdatePreferencesResponse = BetaPreferences;
