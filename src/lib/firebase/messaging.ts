import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { getFirebaseApp } from './config'
import { apiClient } from '@/lib/api/client'

/**
 * Request notification permission and obtain FCM token.
 * Sends the token to the backend automatically.
 *
 * @returns The FCM token if granted, null otherwise
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications not supported in this browser')
    return null
  }

  const app = getFirebaseApp()
  if (!app) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.log('[FCM] Notification permission denied')
    return null
  }

  try {
    const messaging = getMessaging(app)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    if (!vapidKey) {
      console.warn('[FCM] VAPID key not configured')
      return null
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      // Send token to backend
      await apiClient.patch('/users/me/fcm-token', { fcmToken: token })
      console.log('[FCM] Token registered successfully')
    }

    return token
  } catch (error) {
    console.error('[FCM] Error getting token:', error)
    return null
  }
}

/**
 * Listen for foreground messages.
 * Call this in a component that stays mounted while the app is open.
 *
 * @param callback - Called when a push message arrives while app is in foreground
 * @returns Unsubscribe function, or null if not supported
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void,
): (() => void) | null {
  if (typeof window === 'undefined') return null

  const app = getFirebaseApp()
  if (!app) return null

  try {
    const messaging = getMessaging(app)
    return onMessage(messaging, callback)
  } catch (error) {
    console.error('[FCM] Error setting up foreground listener:', error)
    return null
  }
}

/**
 * Remove FCM token from backend (on logout).
 */
export async function removeFcmToken(): Promise<void> {
  try {
    await apiClient.delete('/users/me/fcm-token')
    console.log('[FCM] Token removed from backend')
  } catch (error) {
    console.error('[FCM] Error removing token:', error)
  }
}
