'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

/**
 * PushNotificationHandler
 *
 * Mount this in the root layout (inside AuthProvider).
 * Listens for foreground FCM messages and shows a native Notification
 * with click-to-navigate support.
 */
export function PushNotificationHandler() {
  const { lastMessage } = usePushNotifications()
  const router = useRouter()

  useEffect(() => {
    if (!lastMessage) return

    const { notification, data } = lastMessage
    if (!notification) return

    // Show a native notification for foreground messages
    if (Notification.permission === 'granted') {
      const n = new Notification(notification.title || 'Leasefy', {
        body: notification.body || '',
        icon: '/icons/icon-192x192.png',
      })

      n.onclick = () => {
        window.focus()
        const url = (data as Record<string, string>)?.url
        if (url) {
          router.push(url)
        }
        n.close()
      }
    }
  }, [lastMessage, router])

  return null
}
