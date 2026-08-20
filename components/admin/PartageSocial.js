'use client'

import { useEffect, useRef, useState } from 'react'
import { genererVisuelPartage, telechargerCanvas } from '@/lib/visuelPartage'

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

function genererLegende({ type, titre, resume, genre, region, tranche_age, lien, chapitreLabel }) {
  const resumeCourt = tronquer(resume, 200)
  const accroche = chapitreLabel ? `${chapitreLabel} de « ${titre} »` : titre

  const intros = {
    roman: `📖 ${accroche}`,
    livre: `📘 ${accroche}`,
    'conte-africain': `🌍 ${accroche}${region ? ` — un conte du ${region}` : ''}`,
    'conte-enfant': `✨ ${accroche}${tranche_age ? ` — une histoire pour les ${tranche_age}` : ''}`,
  }

  return `${intros[type]}\n\n${resumeCourt}\n\n📖 Découvre la suite sur Encre — lien dans la bio\n\n(lien direct : ${lien})\n\n#Encre #LectureFrancophone`
}

// Bouton "Partager" : génère un vrai visuel téléchargeable (titre + genre + éventuel chapitre
// incrustés dans l'image, avec l'appel à l'action) plus une légende assortie — rien n'est publié
// automatiquement, Life télécharge et poste elle-même sur Facebook/Instagram.
export default function PartageSocial({ type, titre, resume, genre, region, tranche_age, slug, couvertureUrl, chapitreLabel }) {
  const [ouvert, setOuvert] = useState(false)
  const [copie, setCopie] = useState(false)
  const [pret, setPret] = useState(false)
  const canvasRef = useRef(null)

  const lien = typeof window !== 'undefined' ? `${window.location.origin}/${CHEMIN_PAR_TYPE[type]}/${slug}` : ''
  const legende = genererLegende({ type, titre, resume, genre, region, tranche_age, lien, chapitreLabel })

  useEffect(() => {
    if (!ouvert || !canvasRef.current) return
    setPret(false)
    genererVisuelPartage(canvasRef.current, { type, titre, genre, couvertureUrl, chapitreLabel }).then(() => setPret(true))
  }, [ouvert, type, titre, genre, couvertureUrl, chapitreLabel])

  async function copier() {
    try {
      await navigator.clipboard.writeText(legende)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // le texte reste sélectionnable manuellement dans le champ
    }
  }

  function telecharger() {
    telechargerCanvas(canvasRef.current, `encre-${slug}${chapitreLabel ? '-' + chapitreLabel.toLowerCase().replace(/\s+/g, '-') : ''}.jpg`)
  }

  return (
    <div className="shrink-0">
      <button onClick={() => setOuvert((v) => !v)} className="text-papier/50 hover:text-or transition-colors">
        Partager
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOuvert(false)}>
          <div
            className="bg-encreClair border border-ligne rounded-lg p-4 w-full max-w-sm space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-xs uppercase tracking-wide text-papier/40">
              Visuel {chapitreLabel ? `— ${chapitreLabel}` : ''}
            </p>
            <div className="rounded-md overflow-hidden border border-ligne bg-encre aspect-[4/5] relative">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              {!pret && (
                <div className="absolute inset-0 flex items-center justify-center text-papier/30 text-xs font-mono">
                  Génération…
                </div>
              )}
            </div>
            <button
              onClick={telecharger}
              disabled={!pret}
              className="w-full text-sm border border-or/40 text-or rounded-full py-2 disabled:opacity-40"
            >
              Télécharger le visuel
            </button>

            <p className="font-mono text-xs uppercase tracking-wide text-papier/40 pt-2">Légende</p>
            <textarea
              readOnly
              value={legende}
              rows={7}
              className="w-full bg-encre border border-ligne rounded-md p-3 text-sm text-papier/80 font-sans resize-none"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setOuvert(false)} className="text-xs font-mono text-papier/40 hover:text-papier/70 px-2 py-1.5">
                Fermer
              </button>
              <button onClick={copier} className="text-xs font-mono border border-or/40 text-or rounded-full px-3 py-1.5">
                {copie ? 'Copié ✓' : 'Copier le texte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
