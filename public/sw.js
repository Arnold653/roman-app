// Version du cache : incrémenter ce numéro à chaque changement de stratégie de cache pour que
// activate() nettoie proprement les anciens caches des visiteurs déjà installés.
const VERSION = 'encre-v1'
const CACHE_PAGES = `${VERSION}-pages`
const CACHE_ASSETS = `${VERSION}-assets`

// Les seules routes qu'on traite comme "pages de lecture" à garder disponibles hors connexion —
// pas tout le site (pas l'admin, pas le fil, pas les pages de paiement), seulement là où on lit
// vraiment un roman/livre/conte déjà consulté.
const PREFIXES_LECTURE = ['/roman/', '/livres/', '/contes-africains/', '/contes-enfants/']

function estPageDeLecture(url) {
  return PREFIXES_LECTURE.some((prefixe) => url.pathname.startsWith(prefixe))
}

self.addEventListener('install', (event) => {
  // Sans ça, caches.match('/hors-ligne') dans le fetch handler ne trouve rien tant que cette
  // page n'a jamais été visitée en ligne — et le repli échoue à son tour, laissant le navigateur
  // afficher sa propre page d'erreur brute (ERR_FAILED) au lieu de la page de repli voulue.
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then((cache) => cache.add('/hors-ligne'))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith('encre-') && !n.startsWith(VERSION)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages de lecture : on ne les met PAS en cache ici au fil des requêtes (voir
  // components/CachePourHorsLigne.js, qui s'en charge explicitement pour couvrir aussi bien la
  // navigation classique que la navigation interne Next.js). Ici on gère seulement le repli :
  // réseau d'abord (jamais de vieux contenu tant qu'on est en ligne), et si le réseau échoue —
  // hors connexion — on sert la version déjà en cache, ou la page de repli si elle n'y est pas.
  if (request.mode === 'navigate' && estPageDeLecture(url)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const enCache = await caches.match(url.pathname + url.search)
        return enCache || caches.match('/hors-ligne')
      })
    )
    return
  }

  // Fichiers statiques Next.js : leur nom contient un hash de contenu, une URL donnée ne change
  // donc jamais de contenu — cache-first sans risque, et ça accélère aussi les visites en ligne.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (enCache) =>
          enCache ||
          fetch(request).then((reponse) => {
            const copie = reponse.clone()
            caches.open(CACHE_ASSETS).then((cache) => cache.put(request, copie))
            return reponse
          })
      )
    )
  }
})

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
