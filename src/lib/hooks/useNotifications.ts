/**
 * Notification hooks for landlord and tenant dashboards.
 *
 * Inbox delivery is realtime (Supabase postgres_changes on `notification_logs`)
 * — the previous 2-minute REST poll was removed. On mount we do a single REST
 * fetch for the initial page + unreadCount, then stream INSERTs live. A REST
 * refetch also runs on realtime (re)connect to close any gap opened while the
 * socket was down. Mark-read / mark-all / delete stay on REST.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications.service';
import {
  mapToLandlordNotification,
  mapToTenantNotification,
  type BackendNotification,
} from '@/lib/api/notifications.types';
import { useAuth } from '@/lib/auth/use-auth';
import { useNotificationsRealtime } from './use-notifications-realtime';
import type { LandlordNotification, TenantNotification } from '@/lib/types/notification';

// ============================================================================
// Landlord Notifications Hook
// ============================================================================

interface UseLandlordNotificationsReturn {
  notifications: LandlordNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

interface UseNotificationsOptions {
  /** When false the hook neither fetches nor opens a realtime channel. Used by
   *  PlanHeader, which mounts both role hooks but only one is active — this
   *  avoids a double fetch and a `notifications:{userId}` channel collision.
   *  Defaults to true so single-role call sites need no change. */
  enabled?: boolean;
}

export function useLandlordNotifications(
  { enabled = true }: UseNotificationsOptions = {},
): UseLandlordNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<LandlordNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // Mirror of the loaded ids, kept in a ref so the realtime INSERT handler can
  // dedupe synchronously (before React re-renders) against both the REST page
  // and already-streamed rows.
  const idsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    idsRef.current = new Set(notifications.map((n) => n.id));
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await notificationsApi.getLandlordNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // One-shot initial load (no interval — inbox is realtime from here on).
  useEffect(() => {
    if (enabled) fetchNotifications();
  }, [enabled, fetchNotifications]);

  const handleInsert = useCallback((n: BackendNotification) => {
    const mapped = mapToLandlordNotification(n);
    if (idsRef.current.has(mapped.id)) return;
    idsRef.current.add(mapped.id);
    setNotifications((prev) =>
      prev.some((x) => x.id === mapped.id) ? prev : [mapped, ...prev]
    );
    if (!mapped.read) setUnreadCount((prev) => prev + 1);
  }, []);

  // onReconnect fires on the initial SUBSCRIBED too — skip that one (mount
  // already fetched) and only refetch on genuine reconnects.
  const reconnectedOnceRef = useRef(false);
  const handleReconnect = useCallback(() => {
    if (!reconnectedOnceRef.current) {
      reconnectedOnceRef.current = true;
      return;
    }
    fetchNotifications();
  }, [fetchNotifications]);

  useNotificationsRealtime({
    userId: enabled ? user?.id : undefined,
    onInsert: handleInsert,
    onReconnect: handleReconnect,
  });

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la notificación');
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las notificaciones');
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id && !n.read);
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la notificación');
      throw err;
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}

// ============================================================================
// Tenant Notifications Hook
// ============================================================================

interface UseTenantNotificationsReturn {
  notifications: TenantNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTenantNotifications(
  { enabled = true }: UseNotificationsOptions = {},
): UseTenantNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const idsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    idsRef.current = new Set(notifications.map((n) => n.id));
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await notificationsApi.getTenantNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchNotifications();
  }, [enabled, fetchNotifications]);

  const handleInsert = useCallback((n: BackendNotification) => {
    const mapped = mapToTenantNotification(n);
    if (idsRef.current.has(mapped.id)) return;
    idsRef.current.add(mapped.id);
    setNotifications((prev) =>
      prev.some((x) => x.id === mapped.id) ? prev : [mapped, ...prev]
    );
    if (!mapped.read) setUnreadCount((prev) => prev + 1);
  }, []);

  const reconnectedOnceRef = useRef(false);
  const handleReconnect = useCallback(() => {
    if (!reconnectedOnceRef.current) {
      reconnectedOnceRef.current = true;
      return;
    }
    fetchNotifications();
  }, [fetchNotifications]);

  useNotificationsRealtime({
    userId: enabled ? user?.id : undefined,
    onInsert: handleInsert,
    onReconnect: handleReconnect,
  });

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la notificación');
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las notificaciones');
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id && !n.read);
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // Surface the failure so the caller can toast — don't swallow.
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la notificación');
      throw err;
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
