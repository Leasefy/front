/**
 * Leasefy AI API client.
 *
 * Class-based client with typed methods for all AI orchestrator endpoints.
 * Currently all methods throw "not implemented" errors — the mock layer
 * (Plan 24-02) wraps this client to intercept calls in mock mode.
 *
 * When the real backend is ready, these methods will use fetch() with
 * proper auth headers. The sendMessage method will use SSE for streaming.
 *
 * See: docs/AI-AGENT-ARCHITECTURE.md Section 9
 */

import { getApiConfig } from './config';
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
} from './types';

// ============================================================================
// Client
// ============================================================================

export class LeasefyAIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiConfig().baseUrl;
  }

  // --------------------------------------------------------------------------
  // Auth helper (placeholder — will read from Clerk session or cookie)
  // --------------------------------------------------------------------------

  private getAuthHeaders(): Record<string, string> {
    // TODO(24-02): Wire up real auth token from Clerk session
    return {
      'Content-Type': 'application/json',
    };
  }

  // --------------------------------------------------------------------------
  // Chat
  // --------------------------------------------------------------------------

  /**
   * Send a message to the AI orchestrator.
   * Returns an async generator that yields ChatStreamEvent objects.
   *
   * In mock mode (Plan 24-02), this will be intercepted by the mock layer.
   * In production, this will open an SSE connection to the backend.
   */
  async *sendMessage(
    _req: SendMessageRequest
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    throw new Error(
      'LeasefyAIClient.sendMessage not implemented — use mock API (set NEXT_PUBLIC_USE_MOCK_API=true). See Plan 24-02.'
    );
    // TypeScript requires a yield to recognize this as a generator.
    // The throw above prevents reaching this line at runtime.
    yield undefined as never;
  }

  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/conversations */
  async listConversations(): Promise<ConversationsListResponse> {
    throw new Error(
      'LeasefyAIClient.listConversations not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** GET /api/v1/ai/conversations/:id */
  async getConversation(_id: string): Promise<ConversationDetailResponse> {
    throw new Error(
      'LeasefyAIClient.getConversation not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** POST /api/v1/ai/conversations */
  async createConversation(): Promise<CreateConversationResponse> {
    throw new Error(
      'LeasefyAIClient.createConversation not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** DELETE /api/v1/ai/conversations/:id */
  async deleteConversation(_id: string): Promise<void> {
    throw new Error(
      'LeasefyAIClient.deleteConversation not implemented — use mock API. See Plan 24-02.'
    );
  }

  // --------------------------------------------------------------------------
  // Decisions
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/decisions */
  async listDecisions(): Promise<DecisionsListResponse> {
    throw new Error(
      'LeasefyAIClient.listDecisions not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** POST /api/v1/ai/decisions/:id/select */
  async selectDecision(
    _id: string,
    _req: SelectDecisionRequest
  ): Promise<SelectDecisionResponse> {
    throw new Error(
      'LeasefyAIClient.selectDecision not implemented — use mock API. See Plan 24-02.'
    );
  }

  // --------------------------------------------------------------------------
  // Briefings
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/briefings */
  async listBriefings(): Promise<BriefingsListResponse> {
    throw new Error(
      'LeasefyAIClient.listBriefings not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** GET /api/v1/ai/briefings/latest */
  async getLatestBriefing(): Promise<LatestBriefingResponse> {
    throw new Error(
      'LeasefyAIClient.getLatestBriefing not implemented — use mock API. See Plan 24-02.'
    );
  }

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/preferences */
  async getPreferences(): Promise<PreferencesResponse> {
    throw new Error(
      'LeasefyAIClient.getPreferences not implemented — use mock API. See Plan 24-02.'
    );
  }

  /** PUT /api/v1/ai/preferences */
  async updatePreferences(
    _req: UpdatePreferencesRequest
  ): Promise<UpdatePreferencesResponse> {
    throw new Error(
      'LeasefyAIClient.updatePreferences not implemented — use mock API. See Plan 24-02.'
    );
  }
}

// ============================================================================
// Singleton
// ============================================================================

/** Singleton client instance — import this for API calls */
export const aiClient = new LeasefyAIClient();
