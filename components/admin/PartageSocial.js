'use client'

import { useState } from 'react'

const CHEMIN_PAR_TYPE = {
  roman: 'roman',
  livre: 'livres',
  'conte-africain': 'contes-africains',
  'conte-enfant': 'contes-enfants',
}

function tronquer(texte, max) {
  if (!texte) return ''
  return texte.length > max ? texte.slice(0, max - 1).trim() + '…' : texte
}

function genererLegende({ type, titre, resume, genre, region, tranche_age, lien }) {
  const resumeCourt = tronquer(resume, 220)

  if (type === 'roman') {
    return `📖 Nouveau roman sur Encre : ${titre}\n\n${resumeCourt}\n\n📱 À lire gratuitement, chapitre par chapitre :\n${lien}\n\n#Encre #RomanAfricain #LectureGratuite #FictionFrancophone`
  }
  if (type === 'livre') {
    return `📘 ${titre} est disponible sur Encre\n\n${resumeCourt}\n\n👉 À lire ici :\n${lien}\n\n#Encre #${(genre || 'DéveloppementPersonnel').replace(/\s+/g, '')} #LectureFrancophone`
  }
  if (type === 'conte-africain') {
    const tag = region ? `#${region.replace(/[\s()'’]+/g, '')}` : '#AfriqueDeLOuest'
    return `🌍 ${titre}${region ? ` — un conte du ${region}` : ' — un conte africain'}\n\n${resumeCourt}\n\n🎧 À lire (et à écouter) sur Encre :\n${lien}\n\n#ContesAfricains #Encre #TraditionOrale ${tag}`
  }
  // conte-enfant
  return `✨ ${titre}${tranche_age ? ` — une histoire pour les ${tranche_age}` : ' — une histoire pour les enfants'}\n\n${resumeCourt}\n\n👨‍👩‍👧 À lire en famille sur Encre :\n${lien}\n\n#ContesPourEnfants #Encre #LectureEnFamille`
}

// Bouton "Partager" : ouvre un panneau avec une légende Facebook/Instagram prête à copier
// (texte uniquement — pas de publication automatique, Life poste elle-même à la main) et,
// si une vraie couverture existe, un lien pour l'ouvrir/télécharger comme visuel du post.
export default function PartageSocial({ type, titre, resume, genre, region, tranche_age, slug, couvertureUrl }) {
  const [ouvert, setOuvert] = useState(false)
  const [copie, setCopie] = useState(false)

  const lien = typeof window !== 'undefined' ? `${window.location.origin}/${CHEMIN_PAR_TYPE[type]}/${slug}` : ''
  const legende = genererLegende({ type, titre, resume, genre, region, tranche_age, lien })

  async function copier() {
    try {
      await navigator.clipboard.writeText(legende)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Rien de bloquant : le texte reste sélectionnable manuellement dans le champ.
    }
  }

  return (
    <div className="shrink-0">
      <button onClick={() => setOuvert((v) => !v)} className="text-papier/50 hover:text-or transition-colors">
        Partager
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOuvert(false)}>
          <div
            className="bg-encreClair border border-ligne rounded-lg p-4 w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-xs uppercase tracking-wide text-papier/40">Légende Facebook / Instagram</p>
            <textarea
              readOnly
              value={legende}
              rows={9}
              className="w-full bg-encre border border-ligne rounded-md p-3 text-sm text-papier/80 font-sans resize-none"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex items-center justify-between gap-3">
              {couvertureUrl ? (
                <a href={couvertureUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-papier/50 hover:text-or">
                  Ouvrir la couverture ↗
                </a>
              ) : (
                <span className="text-xs font-mono text-papier/30">Pas encore de couverture uploadée</span>
              )}
              <div className="flex gap-2">
                <button onClick={() => setOuvert(false)} className="text-xs font-mono text-papier/40 hover:text-papier/70 px-2 py-1.5">
                  Fermer
                </button>
                <button onClick={copier} className="text-xs font-mono border border-or/40 text-or rounded-full px-3 py-1.5">
                  {copie ? 'Copié ✓' : 'Copier le texte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
