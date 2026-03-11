'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase/messaging'
import type { MessagePayload } from 'firebase/messaging'

export interface PushNotificationState {
  permission: NotificationPermission | 'unsupported'
  isSupported: boolean
  token: string | null
  lastMessage: MessagePayload | null
  requestPermission: () => Promise<string | null>
}

/**
 * Hook for managing push notifications.
 *
 * - Tracks permission state and FCM token
 * - Listens for foreground messages
 * - Provides requestPermission() to trigger the browser prompt
 */
export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<MessagePayload | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // Check support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  // Set up foreground message listener
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return

    unsubRef.current = onForegroundMessage((payload) => {
      setLastMessage(payload)
    })

    return () => {
      unsubRef.current?.()
    }
  }, [isSupported, permission])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return null

    const fcmToken = await requestNotificationPermission()
    setToken(fcmToken)
    setPermission(Notification.permission)
    return fcmToken
  }, [isSupported])

  return {
    permission,
    isSupported,
    token,
    lastMessage,
    requestPermission,
  }
}
