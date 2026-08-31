import { apiClient } from './client';
import type {
  BackendConversationsResponse,
  BackendConversationWithMessages,
} from './messages.types';

export const messagesApi = {
  /** GET /messages/conversations - List all conversations for current user.
   * contract-addendum-2.md §B.3 — item shape breaks (kind/propertyId new,
   * applicationId nullable); the envelope itself is unchanged (E-3). */
  getConversations() {
    return apiClient.get<BackendConversationsResponse>('/messages/conversations');
  },

  /** GET /messages/unread-count - Total unread messages across all
   * conversations. Shape unchanged; scope re-rooted server-side (§B.3) so
   * an inquiry thread's unread messages are now counted too — no front
   * change needed for that half of the fix. */
  getUnreadCount() {
    return apiClient.get<{ count: number }>('/messages/unread-count');
  },

  // ── New universal routes (contract-addendum-2.md §B.8) ───────────────────
  // `conversation.id` (ApplicationConversation.id) is the identity for BOTH
  // kinds — an APPLICATION thread's `id` is the same value whether reached
  // through these routes or the compat ones below. MessagesWidget always
  // has the real `id` from `getConversations()`, so it uses these
  // exclusively — "calling the new routes for both kinds is simpler and is
  // the recommended shape" (§B.3 item 2).

  /** GET /conversations/:id */
  getConversationMessages(conversationId: string) {
    return apiClient.get<BackendConversationWithMessages>(`/conversations/${conversationId}`);
  },

  /** POST /conversations/:id/messages */
  sendConversationMessage(conversationId: string, content: string) {
    return apiClient.post<{ id: string; content: string; senderId: string; createdAt: string }>(
      `/conversations/${conversationId}/messages`,
      { content },
    );
  },

  /** PATCH /conversations/:id/read → { updated: number } (a DIFFERENT shape
   * from the legacy markApplicationAsRead below — both frozen as-is, §B.8). */
  markConversationAsRead(conversationId: string) {
    return apiClient.patch<{ updated: number }>(`/conversations/${conversationId}/read`);
  },

  /**
   * POST /properties/:propertyId/conversations — creates or resolves the
   * caller's PROPERTY_INQUIRY thread on a listing (§B.2). No body. Existing
   * thread → 200, new thread → 201; both return the same shape. Not
   * `@Public()` — registration is required (O-1).
   */
  createPropertyInquiry(propertyId: string) {
    return apiClient.post<{ conversationId: string }>(`/properties/${propertyId}/conversations`, {});
  },

  // ── Legacy compat routes — "stays live" (contract-addendum-2.md §B.8) ────
  // Used only by the two standalone <ChatThread> call sites that know an
  // applicationId but never resolve a conversation.id (tenant's own
  // application page, agency CandidateDrawer). An APPLICATION thread's
  // applicationId is a stable identity that never changes, so there is no
  // correctness gap in keeping these on the compat path.

  /** GET /applications/:id/chat */
  getApplicationMessages(applicationId: string) {
    return apiClient.get<BackendConversationWithMessages>(
      `/applications/${applicationId}/chat`,
    );
  },

  /** POST /applications/:id/chat/messages */
  sendApplicationMessage(applicationId: string, content: string) {
    return apiClient.post<{ id: string; content: string; senderId: string; createdAt: string }>(
      `/applications/${applicationId}/chat/messages`,
      { content },
    );
  },

  /** PATCH /applications/:id/chat/read → { message: string } (unchanged shape). */
  markApplicationAsRead(applicationId: string) {
    return apiClient.patch<{ message: string }>(
      `/applications/${applicationId}/chat/read`,
    );
  },
};
