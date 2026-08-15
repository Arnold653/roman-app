'use client'

import { useEffect } from 'react'

const CACHE_PAGES = 'encre-v1-pages'

// Monté sur les 4 pages de lecture (roman/livre/contes) : dès l'ouverture — que ce soit par un
// clic depuis l'app (navigation interne Next.js) ou un chargement complet — on va chercher une
// copie fraîche du document HTML et on la range dans le cache du service worker. C'est ce qui
// permet de rouvrir cette même page hors connexion plus tard, quelle que soit la façon dont elle
// a été atteinte la première fois : intercepter seulement les vraies navigations (mode
// "navigate") dans le service worker n'aurait pas suffi à couvrir les clics internes.
export default function CachePourHorsLigne() {
  useEffect(() => {
    if (!('caches' in window) || !('serviceWorker' in navigator)) return

    let annule = false
    const cle = window.location.pathname + window.location.search

    navigator.serviceWorker.ready
      .then(() => {
        if (annule) return null
        return fetch(window.location.href, { headers: { Accept: 'text/html' } })
      })
      .then((reponse) => {
        if (annule || !reponse || !reponse.ok) return
        return caches.open(CACHE_PAGES).then((cache) => cache.put(cle, reponse))
      })
      .catch(() => {
        // Best-effort : si ça échoue (hors ligne dès la première visite, navigateur sans support...),
        // la page reste simplement indisponible hors connexion, rien de grave.
      })

    return () => {
      annule = true
    }
  }, [])

  return null
}
