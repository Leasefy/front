import { apiClient, ApiError } from './client';
import type {
  BackendConversationsResponse,
  BackendConversationWithMessages,
  ConversationActionResult,
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

  // ── Alias de los nombres viejos ──────────────────────────────────────────
  // `feature/cambios-nico` (el piloto, el portal del inquilino) llama a estos
  // por el nombre anterior. Mismo endpoint, misma forma: se conservan para no
  // perseguir a los callers en el merge; los nombres nuevos son los canónicos.
  getMessages(applicationId: string) {
    return messagesApi.getApplicationMessages(applicationId);
  },
  sendMessage(applicationId: string, content: string) {
    return messagesApi.sendApplicationMessage(applicationId, content);
  },
  markAsRead(applicationId: string) {
    return messagesApi.markApplicationAsRead(applicationId);
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

  // --------------------------------------------------------------------------
  // Conversation actions — archive / mute / report (COMU-02)
  //
  // No NestJS route exists yet (external dep — RESEARCH §3). Each degrades
  // HONESTLY: a not-live route (404/403/offline) resolves to `'unavailable'` so
  // the widget shows an honest "Próximamente" toast — it NEVER fabricates a
  // success and never performs a silent local hide implying persistence. These
  // are SHARED by tenant + landlord/agency: the widget calls them in place of the
  // old `alert()` placeholders (additive — v7.0 never breaks the shared widget).
  // --------------------------------------------------------------------------

  /**
   * PATCH /messages/conversations/:id/archive — archive a conversation.
   *
   * Returns `'unavailable'` when the route is not live (404/403/0), `'ok'`
   * otherwise. `'unavailable'` is the EXPECTED result today — never a fake
   * success, and never a silent client-only hide of a legally-relevant thread.
   */
  async archiveConversation(conversationId: string): Promise<ConversationActionResult> {
    try {
      await apiClient.patch(`/messages/conversations/${conversationId}/archive`);
      return 'ok';
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return 'unavailable';
      }
      throw err;
    }
  },

  /**
   * PATCH /messages/conversations/:id/mute — mute a conversation's notifications.
   *
   * Returns `'unavailable'` when the route is not live (404/403/0), `'ok'`
   * otherwise. Honest degrade — never a fabricated success.
   */
  async muteConversation(conversationId: string): Promise<ConversationActionResult> {
    try {
      await apiClient.patch(`/messages/conversations/${conversationId}/mute`);
      return 'ok';
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return 'unavailable';
      }
      throw err;
    }
  },

  /**
   * POST /messages/conversations/:id/report — report a conversation to the agency.
   *
   * `reason` is VOLUNTARY free-text supplied by the user. The frontend must NEVER
   * require it nor pre-fill a suggested explanation for non-payment — Ley 2300
   * art. 7 forbids demanding a reason for a payment delay. Returns `'unavailable'`
   * when the route is not live (404/403/0), `'ok'` otherwise — never a fake success.
   */
  async reportConversation(
    conversationId: string,
    reason?: string,
  ): Promise<ConversationActionResult> {
    try {
      await apiClient.post(`/messages/conversations/${conversationId}/report`, { reason });
      return 'ok';
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return 'unavailable';
      }
      throw err;
    }
  },

  /**
   * Send a chat attachment — CONTRACT STUB (COMU-02).
   *
   * Modeled on `documents.service.ts` `upload` (multipart FormData, Bearer,
   * entityType/entityId) so the eventual real send drops in HERE — but it does
   * NOT POST today and ALWAYS resolves `null`, because there are TWO backend gaps
   * (RESEARCH §2): no chat-attachment endpoint AND no attachment field on
   * `BackendChatMessage`. `null` keeps the UI on an honest "Próximamente".
   *
   * It MUST NOT stage the file to the documents store (`documentsApi.upload` /
   * `POST /documents`) from the chat path — that would create an orphaned document
   * invisible to the thread (a "looks done but isn't" trap). Future bytes
   * retrieval will use `documentsApi.getSignedUrl` (short-lived, ownership-checked
   * — no IDOR).
   */
  async sendAttachment(conversationId: string, file: File): Promise<null> {
    // Intentionally inert: no endpoint + no message attachment field yet. The
    // multipart shape below documents the eventual contract WITHOUT sending it:
    //   const formData = new FormData();
    //   formData.append('file', file);
    //   formData.append('entityType', 'conversation');
    //   formData.append('entityId', conversationId);
    //   → POST /messages/conversations/:id/attachments (Bearer) once it exists.
    void conversationId;
    void file;
    return null;
  },
};
