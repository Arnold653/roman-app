'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function decouper(msRestant) {
  const total = Math.max(0, Math.floor(msRestant / 1000))
  return {
    jours: Math.floor(total / 86400),
    heures: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    secondes: total % 60,
  }
}

// Affichée sur la page du roman quand un prochain chapitre est programmé mais pas encore sorti.
// À zéro : appelle /api/premiere/verifier (qui publie + notifie côté serveur) puis rafraîchit
// la page pour révéler le chapitre, sans attendre le cron quotidien.
export default function CompteAReboursPremiere({ publieLe, numero, titre }) {
  const router = useRouter()
  const cible = new Date(publieLe).getTime()
  const [msRestant, setMsRestant] = useState(cible - Date.now())
  const [declenche, setDeclenche] = useState(false)

  useEffect(() => {
    const intervalle = setInterval(() => {
      setMsRestant(cible - Date.now())
    }, 1000)
    return () => clearInterval(intervalle)
  }, [cible])

  useEffect(() => {
    if (msRestant > 0 || declenche) return
    setDeclenche(true)
    fetch('/api/premiere/verifier')
      .catch(() => {})
      .finally(() => {
        setTimeout(() => router.refresh(), 800)
      })
  }, [msRestant, declenche, router])

  if (msRestant <= 0) {
    return (
      <div className="mt-12 rounded-2xl border border-or/40 bg-or/5 px-6 py-8 text-center lever">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-or mb-2">C'est sorti</p>
        <p className="text-papier/60 text-sm">Le chapitre {numero} arrive…</p>
      </div>
    )
  }

  const { jours, heures, minutes, secondes } = decouper(msRestant)
  const unites = [
    { valeur: jours, label: 'j' },
    { valeur: heures, label: 'h' },
    { valeur: minutes, label: 'min' },
    { valeur: secondes, label: 's' },
  ]

  return (
    <div className="mt-12 rounded-2xl border border-ligne bg-encreClair/60 px-6 py-8 text-center">
      <p className="font-mono text-[0.65rem] uppercase tracking-widest text-or mb-2">Première à venir</p>
      <h3 className="font-display text-xl text-papier mb-6">
        {titre ? titre : `Chapitre ${numero}`}
      </h3>
      <div className="flex items-center justify-center gap-4 md:gap-6">
        {unites.map((u) => (
          <div key={u.label} className="flex flex-col items-center">
            <span className="font-display text-3xl md:text-4xl text-papier tabular-nums">
              {String(u.valeur).padStart(2, '0')}
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-papier/40 mt-1">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
