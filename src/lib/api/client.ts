import { getSupabase } from '@/lib/supabase/client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : await getAuthHeaders()

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    throw new ApiError(401, 'No autorizado')
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errorBody.message || `Error ${res.status}`)
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) => request<T>('PATCH', path, body, token),
  delete: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
}
/**
 * Leasefy AI API client.
 *
 * Class-based client with typed methods for all AI orchestrator endpoints.
 * Each method checks isMockMode() and routes to either the mock layer
 * or real fetch-based API calls.
 *
 * - sendMessage returns AsyncGenerator<ChatStreamEvent> in both paths
 * - Mock path uses mockChatStream / mockApi from ./mock
 * - Real path uses connectChatStream + parseSSEStream from ./streaming
 *
 * See: docs/AI-AGENT-ARCHITECTURE.md Section 9
 */

import { getApiConfig, isMockMode } from './config';
import { mockChatStream, mockApi } from './mock';
import { parseSSEStream, connectChatStream } from './streaming';
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
    // TODO: Wire up real auth token from Clerk session
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch helper for JSON endpoints (non-streaming).
   * Attaches auth headers and handles error responses.
   */
  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.getAuthHeaders(),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API error: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  // --------------------------------------------------------------------------
  // Chat
  // --------------------------------------------------------------------------

  /**
   * Send a message to the AI orchestrator.
   * Returns an async generator that yields ChatStreamEvent objects.
   *
   * In mock mode: delegates to mockChatStream (simulated delays + events).
   * In production: opens SSE connection via connectChatStream + parseSSEStream.
   */
  async *sendMessage(
    req: SendMessageRequest
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    if (isMockMode()) {
      yield* mockChatStream(req);
      return;
    }

    const response = await connectChatStream(this.baseUrl, req);
    yield* parseSSEStream(response);
  }

  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/conversations */
  async listConversations(): Promise<ConversationsListResponse> {
    if (isMockMode()) return mockApi.listConversations();
    const res = await this.fetch('/conversations');
    return res.json();
  }

  /** GET /api/v1/ai/conversations/:id */
  async getConversation(id: string): Promise<ConversationDetailResponse> {
    if (isMockMode()) return mockApi.getConversation(id);
    const res = await this.fetch(`/conversations/${id}`);
    return res.json();
  }

  /** POST /api/v1/ai/conversations */
  async createConversation(): Promise<CreateConversationResponse> {
    if (isMockMode()) return mockApi.createConversation();
    const res = await this.fetch('/conversations', { method: 'POST' });
    return res.json();
  }

  /** DELETE /api/v1/ai/conversations/:id */
  async deleteConversation(id: string): Promise<void> {
    if (isMockMode()) return mockApi.deleteConversation(id);
    await this.fetch(`/conversations/${id}`, { method: 'DELETE' });
  }

  // --------------------------------------------------------------------------
  // Decisions
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/decisions */
  async listDecisions(): Promise<DecisionsListResponse> {
    if (isMockMode()) return mockApi.listDecisions();
    const res = await this.fetch('/decisions');
    return res.json();
  }

  /** POST /api/v1/ai/decisions/:id/select */
  async selectDecision(
    id: string,
    req: SelectDecisionRequest
  ): Promise<SelectDecisionResponse> {
    if (isMockMode()) return mockApi.selectDecision(id, req);
    const res = await this.fetch(`/decisions/${id}/select`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Briefings
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/briefings */
  async listBriefings(): Promise<BriefingsListResponse> {
    if (isMockMode()) return mockApi.listBriefings();
    const res = await this.fetch('/briefings');
    return res.json();
  }

  /** GET /api/v1/ai/briefings/latest */
  async getLatestBriefing(): Promise<LatestBriefingResponse> {
    if (isMockMode()) return mockApi.getLatestBriefing();
    const res = await this.fetch('/briefings/latest');
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  /** GET /api/v1/ai/preferences */
  async getPreferences(): Promise<PreferencesResponse> {
    if (isMockMode()) return mockApi.getPreferences();
    const res = await this.fetch('/preferences');
    return res.json();
  }

  /** PUT /api/v1/ai/preferences */
  async updatePreferences(
    req: UpdatePreferencesRequest
  ): Promise<UpdatePreferencesResponse> {
    if (isMockMode()) return mockApi.updatePreferences(req);
    const res = await this.fetch('/preferences', {
      method: 'PUT',
      body: JSON.stringify(req),
    });
    return res.json();
  }
}

// ============================================================================
// Singleton
// ============================================================================

/** Singleton client instance — import this for API calls */
export const aiClient = new LeasefyAIClient();
