/* eslint-disable no-undef */

// Firebase Messaging Service Worker
// Handles push notifications when the app is in the background or closed.

importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAae-Z6beDzbdkuzo4ksXCiGWK5gHBFAkw',
  authDomain: 'leasefy-6f315.firebaseapp.com',
  projectId: 'leasefy-6f315',
  storageBucket: 'leasefy-6f315.firebasestorage.app',
  messagingSenderId: '671190957303',
  appId: '1:671190957303:web:c5d267fef87aa6ded5e7f2',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  const data = payload.data || {}

  self.registration.showNotification(title || 'Leasefy', {
    body: body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url: data.url || '/' },
    tag: data.notificationId || undefined,
  })
})

// Handle notification click — open the relevant URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new tab
      return clients.openWindow(url)
    }),
  )
})
