'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function ActiverPush() {
  const [statut, setStatut] = useState('verification') // verification | disponible | actif | refuse | indisponible

  useEffect(() => {
    async function verifier() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatut('indisponible')
        return
      }
      if (Notification.permission === 'denied') {
        setStatut('refuse')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      const abonnement = await registration.pushManager.getSubscription()
      setStatut(abonnement ? 'actif' : 'disponible')
    }
    verifier()
  }, [])

  async function activer() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatut('refuse')
      return
    }

    const registration = await navigator.serviceWorker.ready
    const abonnement = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(abonnement.toJSON()),
    })

    setStatut('actif')
  }

  if (statut === 'verification' || statut === 'indisponible' || statut === 'actif') return null

  return (
    <button
      onClick={activer}
      disabled={statut === 'refuse'}
      className="w-full text-left px-4 py-3 text-sm text-papier/70 hover:bg-encre/60 transition-colors border-b border-ligne disabled:opacity-40 disabled:cursor-not-allowed"
    >
      🔔 {statut === 'refuse' ? 'Notifications bloquées par le navigateur' : 'Activer les notifications push'}
    </button>
  )
}
