'use client'

/**
 * use-notifications-realtime.ts — Realtime inbox subscription.
 *
 * Replaces the previous 2-minute REST poll (useNotifications). Since T-0183 the
 * transport lives in the `subscribeRealtime()` adapter (`src/lib/realtime/`),
 * selected by `NEXT_PUBLIC_REALTIME_PROVIDER`: `supabase` (default, the
 * postgres_changes channel on `notification_logs` described below) or `sse`
 * (the tab's single multiplexed stream to the back's `/realtime/stream`). This
 * hook keeps its signature and only adapts the adapter to React. Notes on the
 * Supabase transport:
 *  - Channel name `notifications:{userId}:{instancia}` — one per hook instance.
 *    🔴 NO uno por usuario: `supabase.channel(nombre)` devuelve el canal que ya
 *    existe si el nombre se repite, y ese ya está suscrito. La campana del
 *    header monta este hook y /inquilino/notificaciones lo monta otra vez: con
 *    el mismo nombre, el segundo `.on()` caía sobre un canal suscrito y la
 *    pantalla reventaba con «cannot add `postgres_changes` callbacks … after
 *    `subscribe()`» (Nico, 2026-09-15). El filtro por usuario vive en `filter`,
 *    no en el nombre: separar canales no cambia qué filas llegan.
 *  - Single client-side predicate `user_id=eq.{userId}` (postgres_changes
 *    limit); row-level isolation is also enforced by RLS
 *    (`user_id = auth.uid()`) so another user never receives these rows.
 *  - schema='public', table='notification_logs'.
 *  - Only IN_APP rows reach the inbox; EMAIL/PUSH/SMS rows are audit records
 *    written to the same table and must be skipped.
 *  - Mark-read / dismiss stay on REST — the front never writes this table.
 *  - Optional `onReconnect` fires on every SUBSCRIBED (initial + reconnect) so
 *    the consumer can refetch and close any gap opened during a disconnect. On
 *    SSE it fires on the initial connect, on a fresh reconnect and on `resync`
 *    (a resume with `lastEventId` already gets its backfill).
 *  - The callbacks are read through refs and the subscription depends only on
 *    `userId`: a parent that re-creates `onInsert` must not tear the shared
 *    stream down and reopen it.
 */

import { useEffect, useRef, useState } from 'react'
import { subscribeRealtime } from '@/lib/realtime/subscribe-realtime'
import type { BackendNotification } from '@/lib/api/notifications.types'

interface UseNotificationsRealtimeOptions {
  /** Supabase auth UUID (=== User.id === auth.uid()). Undefined until session hydrates. */
  userId: string | undefined
  /** Called for each new IN_APP notification, already mapped to BackendNotification. */
  onInsert: (notification: BackendNotification) => void
  /** Fires when the feed (re)connects or must be refetched (initial + reconnect + resync). */
  onReconnect?: () => void
}

export function useNotificationsRealtime({
  userId,
  onInsert,
  onReconnect,
}: UseNotificationsRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)
  const onInsertRef = useRef(onInsert)
  const onReconnectRef = useRef(onReconnect)
  onInsertRef.current = onInsert
  onReconnectRef.current = onReconnect

  useEffect(() => {
    if (!userId) return
    const unsubscribe = subscribeRealtime({
      userId,
      onNotification: (n) => onInsertRef.current(n),
      onReconnect: () => onReconnectRef.current?.(),
      onConnectionChange: setIsConnected,
    })
    return () => {
      setIsConnected(false)
      unsubscribe()
    }
  }, [userId])

  return { isConnected }
}
