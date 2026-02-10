/**
 * Mock API layer for the Leasefy AI platform.
 *
 * Provides:
 * - mockChatStream: AsyncGenerator that simulates SSE streaming with realistic agent
 *   dispatch, content deltas, and decision events
 * - mockApi: Object with all CRUD endpoint mock implementations
 *
 * All mock data delegates to existing data files (mock-chat-responses, mock-agent-executions,
 * mock-decisions, mock-briefings, default-preferences) — no data duplication.
 */

import { getMockResponse } from '@/lib/data/mock-chat-responses';
import { getMockAgentScenario } from '@/lib/data/mock-agent-executions';
import { getMockDecisionScenario } from '@/lib/data/mock-decisions';
import { getTodayBriefing, getMockBriefings } from '@/lib/data/mock-briefings';
import { DEFAULT_PREFERENCES } from '@/lib/data/default-preferences';
import type { AgentType, AgentExecutionStatus } from '@/lib/types/beta-chat';
import type {
  SendMessageRequest,
  ChatStreamEvent,
  ConversationsListResponse,
  ConversationDetailResponse,
  CreateConversationResponse,
  DecisionsListResponse,
  SelectDecisionRequest,
  SelectDecisionResponse,
  BriefingsListResponse,
  LatestBriefingResponse,
  PreferencesResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  ApiBriefing,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert a DailyBriefing from mock-briefings into the ApiBriefing response shape.
 */
function toApiBriefing(
  briefing: ReturnType<typeof getTodayBriefing>
): ApiBriefing {
  return {
    id: briefing.id,
    type: 'daily',
    date: briefing.date.toISOString(),
    greeting: briefing.greeting,
    overallSummary: briefing.overallSummary,
    sections: briefing.sections,
    isNew: briefing.isNew,
    createdAt: briefing.date.toISOString(),
  };
}

// ============================================================================
// Mock Chat Stream
// ============================================================================

/**
 * Simulates SSE streaming by emitting ChatStreamEvent objects
 * with realistic delays matching real orchestrator behavior.
 *
 * Event order:
 *   1. message_start
 *   2. agent_dispatch (if agents triggered by keywords)
 *   3. agent_status per agent (completed, with staggered delays)
 *   4. content_delta (many, small chunks)
 *   5. decision (if applicable)
 *   6. message_complete
 */
export async function* mockChatStream(
  request: SendMessageRequest
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const messageId = generateId();
  const conversationId = request.conversationId || generateId();

  // 1. message_start
  yield { type: 'message_start', conversationId, messageId };
  await delay(100);

  // 2. Agent dispatch (if applicable)
  const agentScenario = getMockAgentScenario(request.message);
  if (agentScenario && agentScenario.length > 0) {
    const agents = agentScenario.map((a) => ({
      id: generateId(),
      agentType: a.agentType as AgentType,
      taskDescription: a.taskDescription,
    }));

    yield { type: 'agent_dispatch', agents };

    // 3. Simulate each agent completing with staggered delays
    for (let i = 0; i < agents.length; i++) {
      await delay(agentScenario[i].durationMs);
      yield {
        type: 'agent_status' as const,
        agentId: agents[i].id,
        status: 'completed' as AgentExecutionStatus,
        durationMs: agentScenario[i].durationMs,
      };
    }
  }

  // 4. Content deltas (small chunk streaming simulation)
  const responseText = getMockResponse(request.message);
  const chunkSize = 3; // characters per delta
  for (let i = 0; i < responseText.length; i += chunkSize) {
    const chunk = responseText.slice(i, i + chunkSize);
    yield { type: 'content_delta', delta: chunk };
    await delay(25); // ~120 chars/sec via SSE
  }

  // 5. Decision (if applicable)
  const decision = getMockDecisionScenario(request.message);
  if (decision) {
    await delay(200);
    yield { type: 'decision', decision };
  }

  // 6. message_complete
  yield {
    type: 'message_complete',
    usage: {
      inputTokens: Math.floor(request.message.length * 1.3),
      outputTokens: responseText.length,
    },
  };
}

// ============================================================================
// Mock CRUD Endpoints
// ============================================================================

/**
 * Mock implementations for all non-streaming API endpoints.
 *
 * Returns realistic static data derived from existing mock data files.
 * Does not use localStorage — the hooks handle their own persistence.
 */
export const mockApi = {
  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------

  listConversations: async (): Promise<ConversationsListResponse> => {
    await delay(200);
    const now = new Date().toISOString();
    return {
      conversations: [
        {
          id: 'conv-1',
          title: 'Cobros pendientes de febrero',
          lastMessage: 'Tienes 3 cobros pendientes por $4.2M COP',
          messageCount: 8,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'conv-2',
          title: 'Pipeline Apt 204 - Chapinero',
          lastMessage: 'Camila Ruiz tiene score 87, recomiendo aprobar',
          messageCount: 5,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'conv-3',
          title: 'Mantenimiento urgente Apt 502',
          lastMessage: 'Plomero confirmado para hoy entre 2-4pm',
          messageCount: 12,
          createdAt: now,
          updatedAt: now,
        },
      ],
      total: 3,
    };
  },

  getConversation: async (
    id: string
  ): Promise<ConversationDetailResponse> => {
    await delay(200);
    const now = new Date().toISOString();
    return {
      id,
      title: 'Conversacion de ejemplo',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Como van mis cobros este mes?',
          createdAt: now,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: getMockResponse('cobros'),
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  },

  createConversation: async (): Promise<CreateConversationResponse> => {
    await delay(100);
    return {
      id: generateId(),
      title: 'Nueva conversacion',
      createdAt: new Date().toISOString(),
    };
  },

  deleteConversation: async (_id: string): Promise<void> => {
    await delay(100);
    // No-op in mock — hook manages its own state
  },

  // --------------------------------------------------------------------------
  // Decisions
  // --------------------------------------------------------------------------

  listDecisions: async (): Promise<DecisionsListResponse> => {
    await delay(200);
    const now = new Date().toISOString();
    // Build from getMockDecisionScenario with different triggers
    const renovacion = getMockDecisionScenario('renovacion');
    const candidato = getMockDecisionScenario('candidato');
    const reparacion = getMockDecisionScenario('reparacion');

    const decisions = [renovacion, candidato, reparacion]
      .filter(Boolean)
      .map((d) => ({
        id: d!.id,
        title: d!.title,
        description: d!.description,
        category: d!.category,
        options: d!.options,
        conversationId: 'conv-1',
        createdAt: now,
      }));

    return {
      decisions,
      pendingCount: decisions.length,
    };
  },

  selectDecision: async (
    _id: string,
    _req: SelectDecisionRequest
  ): Promise<SelectDecisionResponse> => {
    await delay(300);
    return {
      status: 'accepted',
      actionsTriggered: ['Notificacion enviada al inquilino'],
    };
  },

  // --------------------------------------------------------------------------
  // Briefings
  // --------------------------------------------------------------------------

  listBriefings: async (): Promise<BriefingsListResponse> => {
    await delay(200);
    const briefings = getMockBriefings().map(toApiBriefing);
    return { briefings };
  },

  getLatestBriefing: async (): Promise<LatestBriefingResponse> => {
    await delay(200);
    return toApiBriefing(getTodayBriefing());
  },

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  getPreferences: async (): Promise<PreferencesResponse> => {
    await delay(100);
    return { ...DEFAULT_PREFERENCES };
  },

  updatePreferences: async (
    req: UpdatePreferencesRequest
  ): Promise<UpdatePreferencesResponse> => {
    await delay(200);
    // Deep merge with defaults for mock — real API does this server-side
    return {
      ...DEFAULT_PREFERENCES,
      ...req,
      autonomy: {
        ...DEFAULT_PREFERENCES.autonomy,
        ...(req.autonomy || {}),
      },
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(req.notifications || {}),
        categories: {
          ...DEFAULT_PREFERENCES.notifications.categories,
          ...(req.notifications?.categories || {}),
        },
      },
      thresholds: {
        ...DEFAULT_PREFERENCES.thresholds,
        ...(req.thresholds || {}),
      },
    };
  },
};
