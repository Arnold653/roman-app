'use client'

import { useEffect, useState } from 'react'

// Petit bandeau rassurant plutôt qu'inquiétant : on est hors connexion, mais les pages déjà
// consultées restent lisibles. N'affirme rien sur ce qui EST en cache (on ne le sait pas ici),
// juste que la lecture continue de fonctionner pour ce qui a déjà été ouvert.
export default function BandeauHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(false)

  useEffect(() => {
    setHorsLigne(!navigator.onLine)
    const surHorsLigne = () => setHorsLigne(true)
    const surEnLigne = () => setHorsLigne(false)
    window.addEventListener('offline', surHorsLigne)
    window.addEventListener('online', surEnLigne)
    return () => {
      window.removeEventListener('offline', surHorsLigne)
      window.removeEventListener('online', surEnLigne)
    }
  }, [])

  if (!horsLigne) return null

  return (
    <div className="sticky top-0 z-50 bg-or/15 border-b border-or/30 backdrop-blur-sm">
      <p className="text-center text-xs font-mono uppercase tracking-widest text-papier/70 py-2 px-4">
        Hors connexion — les pages déjà consultées restent disponibles
      </p>
    </div>
  )
}
