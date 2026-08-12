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
// useChat - messages for a specific conversation (by applicationId)
// ============================================================================

export function useChat(applicationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? '';

  const fetchMessages = useCallback(async () => {
    if (!applicationId || !userId) return;
    try {
      const res = await messagesApi.getMessages(applicationId);
      const mapped = (res.messages as BackendChatMessage[]).map((m) =>
        mapToMessage(m, userId),
      );
      setMessages(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando mensajes';
      setError(message);
    }
  }, [applicationId, userId]);

  // Initial fetch
  useEffect(() => {
    if (!applicationId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchMessages().finally(() => setIsLoading(false));
  }, [applicationId, fetchMessages]);

  // Polling every 5s while conversation is open
  useEffect(() => {
    if (!applicationId) return;
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [applicationId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!applicationId || !userId) return;
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

        await messagesApi.sendMessage(applicationId, content);
        // Refetch to get real message with server ID
        await fetchMessages();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error enviando mensaje');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      } finally {
        setIsSending(false);
      }
    },
    [applicationId, userId, user?.name, fetchMessages],
  );

  const markAsRead = useCallback(async () => {
    if (!applicationId) return;
    try {
      await messagesApi.markAsRead(applicationId);
    } catch {
      // Silently fail - non-critical
    }
  }, [applicationId]);

  return { messages, isLoading, isSending, error, sendMessage, markAsRead, refetch: fetchMessages };
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
