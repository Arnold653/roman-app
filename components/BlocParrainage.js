'use client'

import { useState } from 'react'

// N'affiché que sur son propre profil (estMonProfil, vérifié côté page appelante). Le "code" de
// parrainage est simplement le pseudo — inutile de générer un identifiant séparé, il est déjà
// unique et lisible. Le lien capté au ?ref=... à l'inscription relie le compte au parrain (voir
// migration-parrainage.sql).
export default function BlocParrainage({ pseudo, nbFilleuls }) {
  const [copie, setCopie] = useState(false)

  async function copier() {
    const lien = `${window.location.origin}/login?ref=${encodeURIComponent(pseudo)}`
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // rien de bloquant
    }
  }

  return (
    <div className="bg-encreClair/50 border border-ligne rounded-lg p-4 mb-8">
      <p className="text-xs font-mono uppercase tracking-wide text-papier/40 mb-1">Ton lien de parrainage</p>
      <p className="text-papier/60 text-sm mb-3">
        {nbFilleuls > 0
          ? `${nbFilleuls} personne${nbFilleuls > 1 ? 's ont' : ' a'} rejoint Encre grâce à toi.`
          : 'Invite quelqu\'un à découvrir Encre.'}
      </p>
      <button onClick={copier} className="text-xs font-mono border border-or/40 text-or rounded-full px-4 py-2">
        {copie ? 'Copié ✓' : 'Copier le lien'}
      </button>
    </div>
  )
}
