'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesApi } from '@/lib/api/messages.service';
import { useAuth } from '@/lib/auth';
import type {
  ChatConversation,
  ChatMessage,
  BackendChatMessage,
} from '@/lib/api/messages.types';
import { mapToConversation, mapToMessage } from '@/lib/api/messages.types';

// ============================================================================
// useConversations - inbox conversation list
// ============================================================================

export function useConversations() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El error entero además del mensaje: `FalloDeCarga` clasifica por status.
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const res = await messagesApi.getConversations();
      const mapped = res.conversations.map(mapToConversation);
      setConversations(mapped);
      setTotalUnread(mapped.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando conversaciones';
      setErrorCrudo(err);
      setError(message);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, totalUnread, isLoading, error, errorCrudo, refetch: fetchConversations };
}

// ============================================================================
// useChat / useApplicationChat - messages for a single thread
// ============================================================================
//
// contract-addendum-2.md §B.3 item 2 — "calling the new routes for both
// kinds is simpler and is the recommended shape". `useChat` is the
// universal hook, keyed on `conversation.id` (works for BOTH APPLICATION
// and PROPERTY_INQUIRY threads — `ApplicationConversation.id` is the same
// identity either way). `MessagesWidget` uses this exclusively, since it
// already has the real `id` for every row from `getConversations()`.
//
// `useApplicationChat` keeps the LEGACY compat routes (§B.8 — "stays live")
// for the two standalone <ChatThread> call sites that only ever know an
// `applicationId` and never resolve a `conversation.id` (the tenant's own
// application page, the agency `CandidateDrawer`). An APPLICATION thread's
// `applicationId` is a stable identity, so there is no correctness gap in
// keeping these two screens on the compat path instead of teaching them to
// resolve a conversation id they have no other use for.

interface ThreadMessagesApi {
  getMessages: (id: string) => Promise<{ messages: BackendChatMessage[] }>;
  sendMessage: (id: string, content: string) => Promise<unknown>;
  markAsRead: (id: string) => Promise<unknown>;
}

function useThreadMessages(id: string | null, api: ThreadMessagesApi) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? '';

  const fetchMessages = useCallback(async () => {
    if (!id || !userId) return;
    try {
      const res = await api.getMessages(id);
      const mapped = res.messages.map((m) => mapToMessage(m, userId));
      setMessages(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando mensajes';
      setError(message);
    }
    // `api` is a fresh object literal from the caller every render by
    // design (see useChat/useApplicationChat below) — its methods are
    // stable `messagesApi.*` references, so it is intentionally excluded
    // from the dependency array to avoid re-fetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  // Initial fetch
  useEffect(() => {
    if (!id) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchMessages().finally(() => setIsLoading(false));
  }, [id, fetchMessages]);

  // Polling every 5s while conversation is open
  useEffect(() => {
    if (!id) return;
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!id || !userId) return;
      setIsSending(true);
      try {
        // Optimistic append
        const optimistic: ChatMessage = {
          id: `temp-${Date.now()}`,
          content,
          isMine: true,
          senderName: user?.name ?? 'Yo',
          readAt: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        await api.sendMessage(id, content);
        // Refetch to get real message with server ID
        await fetchMessages();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error enviando mensaje');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      } finally {
        setIsSending(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [id, userId, user?.name, fetchMessages],
  );

  const markAsRead = useCallback(async () => {
    if (!id) return;
    try {
      await api.markAsRead(id);
    } catch {
      // Silently fail - non-critical
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { messages, isLoading, isSending, error, sendMessage, markAsRead, refetch: fetchMessages };
}

/** Universal hook, keyed on `conversation.id`. Use this for anything that
 * comes from `useConversations()` / `MessagesWidget` — works for both
 * APPLICATION and PROPERTY_INQUIRY threads. */
export function useChat(conversationId: string | null) {
  return useThreadMessages(conversationId, {
    getMessages: messagesApi.getConversationMessages,
    sendMessage: messagesApi.sendConversationMessage,
    markAsRead: messagesApi.markConversationAsRead,
  });
}

/** Legacy compat hook, keyed on `applicationId` (§B.8 — "stays live"). Only
 * for the two standalone <ChatThread> call sites named above. */
export function useApplicationChat(applicationId: string | null) {
  return useThreadMessages(applicationId, {
    getMessages: messagesApi.getApplicationMessages,
    sendMessage: messagesApi.sendApplicationMessage,
    markAsRead: messagesApi.markApplicationAsRead,
  });
}

// ============================================================================
// useUnreadMessages - badge count for sidebars (polls every 30s)
// ============================================================================

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await messagesApi.getUnreadCount();
      setUnreadCount(res.count);
    } catch {
      // Silently fail - non-critical for badge
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    pollingRef.current = setInterval(fetchUnread, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchUnread]);

  return { unreadCount, refetch: fetchUnread };
}
