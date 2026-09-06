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

  /**
   * Enviar.
   *
   * 🔴 Devuelve `true`/`false` además de guardar el error: hasta acá, cuando
   * el POST fallaba, el mensaje optimista se sacaba de la lista y `error`
   * quedaba en un estado que `MessagesWidget` no leía ni pintaba. Resultado:
   * escribías, apretabas enviar, y el texto desaparecía sin una sola palabra.
   * Peor todavía, el campo ya se había vaciado: lo escrito se perdía.
   */
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!id || !userId) return false;
      setIsSending(true);
      setError(null);
      try {
        // Optimistic append
        const optimistic: ChatMessage = {
          id: `temp-${Date.now()}`,
          content,
          isMine: true,
          senderName: user?.name ?? 'Yo',
          // El propio no lleva insignia en pantalla (es la burbuja de la
          // derecha), así que el perfil acá no se muestra nunca; se completa
          // igual porque el tipo lo exige y una mentira de rol es peor que un
          // «sin rol».
          perfil: 'DESCONOCIDO',
          readAt: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        await api.sendMessage(id, content);
        // Refetch to get real message with server ID
        await fetchMessages();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error enviando mensaje');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
        return false;
      } finally {
        setIsSending(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [id, userId, user?.name, fetchMessages],
  );

  /** Para que la pantalla pueda apagar el cartel cuando ya no aplica. */
  const limpiarError = useCallback(() => setError(null), []);

  /**
   * Marcar el hilo como leído.
   *
   * 🔴 Acepta un id EXPLÍCITO por una razón concreta: `MessagesWidget` llamaba
   * a `markAsRead()` dentro del mismo click que hacía `setSelectedConversationId(nuevo)`,
   * y en ese instante este hook todavía está montado sobre el hilo ANTERIOR
   * —el estado nuevo recién llega en el render siguiente—. O sea que abrir la
   * conversación de Beto marcaba como leída la de Ana, y los no leídos de Beto
   * no se limpiaban nunca. Pasándole el id que se acaba de elegir, no hay
   * ventana en la que el hook y la pantalla estén mirando hilos distintos.
   */
  const markAsRead = useCallback(async (idExplicito?: string) => {
    const objetivo = idExplicito ?? id;
    if (!objetivo) return;
    try {
      await api.markAsRead(objetivo);
    } catch {
      // Silently fail - non-critical
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { messages, isLoading, isSending, error, limpiarError, sendMessage, markAsRead, refetch: fetchMessages };
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
