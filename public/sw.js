self.addEventListener('push', (event) => {
  const donnees = event.data ? event.data.json() : {}
  const titre = donnees.titre || 'Encre'
  const options = {
    body: donnees.corps || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { lien: donnees.lien || '/' },
  }
  event.waitUntil(self.registration.showNotification(titre, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const lien = event.notification.data?.lien || '/'
  event.waitUntil(clients.openWindow(lien))
})
