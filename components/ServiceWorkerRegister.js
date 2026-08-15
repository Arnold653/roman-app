'use client'

import { useEffect } from 'react'

// Enregistre le service worker pour tout le monde, dès l'arrivée sur le site — indépendamment de
// components/ActiverPush.js qui, lui, ne s'en sert que si la personne active les notifications.
// Un double appel à register() sur la même URL ne crée pas deux workers, le navigateur réutilise
// l'enregistrement existant : les deux composants peuvent coexister sans conflit.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Best-effort : pas de mode hors ligne pour cette visite, le site reste utilisable en ligne.
    })
  }, [])

  return null
}
