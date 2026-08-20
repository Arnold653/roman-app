'use client'

import { useState } from 'react'
import { genererVisuelPartage } from '@/lib/visuelPartage'

const CHEMIN_PAR_TYPE = {
  roman: 'roman',
  livre: 'livres',
  'conte-africain': 'contes-africains',
  'conte-enfant': 'contes-enfants',
}

// Bouton de partage affiché sur les pages de lecture elles-mêmes (pas l'admin) : génère le même
// visuel (titre + genre + éventuel chapitre, jamais le contenu du texte — aucun risque de
// spoiler) et ouvre directement la fenêtre de partage native du téléphone. Si le partage natif
// de fichier n'est pas supporté par le navigateur, repli sur un simple téléchargement de l'image.
export default function PartagerLecture({ type, titre, genre, region, tranche_age, slug, couvertureUrl, chapitreLabel }) {
  const [enCours, setEnCours] = useState(false)

  async function partager() {
    setEnCours(true)
    try {
      const canvas = document.createElement('canvas')
      await genererVisuelPartage(canvas, { type, titre, genre, couvertureUrl, chapitreLabel })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return

      const lien = `${window.location.origin}/${CHEMIN_PAR_TYPE[type]}/${slug}`
      const texte = chapitreLabel ? `${chapitreLabel} de « ${titre} » sur Encre` : `${titre} sur Encre`
      const fichier = new File([blob], `encre-${slug}.jpg`, { type: 'image/jpeg' })

      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: texte, text: `${texte}\n${lien}` })
      } else {
        // Repli : téléchargement direct, le partage natif fichier n'est pas supporté ici
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `encre-${slug}.jpg`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      // AbortError si le lecteur annule la fenêtre de partage : rien à faire
      if (err?.name !== 'AbortError') console.error(err)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <button
      onClick={partager}
      disabled={enCours}
      className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-papier/40 hover:text-or transition-colors disabled:opacity-40"
    >
      {enCours ? 'Préparation…' : '↗ Partager'}
    </button>
  )
}
