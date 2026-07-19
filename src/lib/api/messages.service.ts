import { apiClient, ApiError } from './client';
import type {
  BackendConversationsResponse,
  BackendConversationWithMessages,
} from './messages.types';

// ---------------------------------------------------------------------------
// Endpoint-not-live detection (copied verbatim from lease-documents.service.ts)
// ---------------------------------------------------------------------------

/**
 * True when the failure means "endpoint not live yet" rather than a genuine
 * error: 404 (route absent), 403 (not wired for this tenant), or 0 (backend
 * unreachable / offline — `ApiError(0)` from the api-client). These degrade the
 * lease-scoped chat CONTRACT to an honest `null` (UI keeps the app-scoped chat +
 * "Próximamente") instead of a crash or a fabricated thread.
 */
function isEndpointUnavailable(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 || err.status === 403 || err.status === 0)
  );
}

export const messagesApi = {
  /** GET /messages/conversations - List all conversations for current user */
  getConversations() {
    return apiClient.get<BackendConversationsResponse>('/messages/conversations');
  },

  /** GET /messages/unread-count - Total unread messages across all conversations */
  getUnreadCount() {
    return apiClient.get<{ count: number }>('/messages/unread-count');
  },

  /** GET /applications/:id/chat - Get conversation messages */
  getMessages(applicationId: string) {
    return apiClient.get<BackendConversationWithMessages>(
      `/applications/${applicationId}/chat`,
    );
  },

  /** POST /applications/:id/chat/messages - Send a message */
  sendMessage(applicationId: string, content: string) {
    return apiClient.post<{ id: string; content: string; senderId: string; createdAt: string }>(
      `/applications/${applicationId}/chat/messages`,
      { content },
    );
  },

  /** PATCH /applications/:id/chat/read - Mark all messages as read */
  markAsRead(applicationId: string) {
    return apiClient.patch<{ message: string }>(
      `/applications/${applicationId}/chat/read`,
    );
  },

  // --------------------------------------------------------------------------
  // Lease-scoped read/send — CONTRACT ONLY (COMU-01)
  //
  // The NestJS lease-scoped chat route does NOT exist yet (external dep —
  // ROADMAP v7-05 external-deps: "NestJS messages.service.ts lease-scoped").
  // These are modeled 1:1 on the applicationId shape above but degrade honestly:
  // a not-live route (404/403/offline) resolves to `null`, so the UI keeps the
  // real app-scoped chat + an honest "Próximamente" for true per-arriendo
  // threading. They NEVER fabricate a lease thread. The applicationId path above
  // is untouched (additive — v7.0 never breaks the shared widget).
  // --------------------------------------------------------------------------

  /**
   * GET /leases/:id/chat — Get the lease-scoped conversation messages.
   *
   * Returns `null` when the endpoint is not live yet (404/403/0) so the caller
   * keeps the app-scoped chat. `null` is the EXPECTED result today; it is never
   * a fabricated thread.
   */
  async getMessagesByLease(
    leaseId: string,
  ): Promise<BackendConversationWithMessages | null> {
    try {
      return await apiClient.get<BackendConversationWithMessages>(
        `/leases/${leaseId}/chat`,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return null;
      }
      throw err;
    }
  },

  /**
   * POST /leases/:id/chat/messages — Send a lease-scoped message.
   *
   * Returns `null` when the endpoint is not live yet (404/403/0) so the caller
   * falls back to the app-scoped send. `null` is the EXPECTED result today; it
   * never fabricates a persisted message.
   */
  async sendMessageByLease(
    leaseId: string,
    content: string,
  ): Promise<{ id: string; content: string; senderId: string; createdAt: string } | null> {
    try {
      return await apiClient.post<{ id: string; content: string; senderId: string; createdAt: string }>(
        `/leases/${leaseId}/chat/messages`,
        { content },
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return null;
      }
      throw err;
    }
  },
};
