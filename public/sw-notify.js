/* Notification-Klick → App in den Vordergrund (PWA / Homescreen) */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = self.registration.scope || '/app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
