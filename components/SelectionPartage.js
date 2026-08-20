'use client'

import { useEffect, useRef, useState } from 'react'
import { genererVisuelCitation } from '@/lib/visuelPartage'

const CHEMIN_PAR_TYPE = {
  roman: 'roman',
  livre: 'livres',
  'conte-africain': 'contes-africains',
  'conte-enfant': 'contes-enfants',
}

// Enveloppe n'importe quel bloc de lecture (chapitre de roman, page de livre/conte...) et
// surveille la sélection de texte du lecteur. Dès qu'il sélectionne un passage à l'intérieur,
// une pastille flottante "Partager cette citation" apparaît en bas de l'écran ; au clic, le
// passage sélectionné (tel quel, jamais tronqué) est incrusté dans un visuel de citation et
// proposé au partage natif du téléphone.
export default function SelectionPartage({ type, titre, slug, couvertureUrl, children }) {
  const conteneurRef = useRef(null)
  const [texteSelectionne, setTexteSelectionne] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    function surSelection() {
      const selection = window.getSelection()
      const texte = selection?.toString().trim() || ''
      if (!texte || !conteneurRef.current) { setTexteSelectionne(''); return }
      const ancre = selection.anchorNode
      if (ancre && conteneurRef.current.contains(ancre)) {
        setTexteSelectionne(texte)
      } else {
        setTexteSelectionne('')
      }
    }
    document.addEventListener('selectionchange', surSelection)
    return () => document.removeEventListener('selectionchange', surSelection)
  }, [])

  async function partagerCitation() {
    const texte = texteSelectionne
    if (!texte) return
    setEnCours(true)
    try {
      const canvas = document.createElement('canvas')
      await genererVisuelCitation(canvas, { type, titre, texte, couvertureUrl })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return

      const lien = `${window.location.origin}/${CHEMIN_PAR_TYPE[type]}/${slug}`
      const fichier = new File([blob], `encre-citation-${slug}.jpg`, { type: 'image/jpeg' })

      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre, text: `« ${texte.slice(0, 80)}${texte.length > 80 ? '…' : ''} » — ${titre}, sur Encre\n${lien}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `encre-citation-${slug}.jpg`
        a.click()
        URL.revokeObjectURL(url)
      }
      window.getSelection()?.removeAllRanges()
      setTexteSelectionne('')
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div ref={conteneurRef}>
      {children}
      {texteSelectionne && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={partagerCitation}
            disabled={enCours}
            className="flex items-center gap-2 bg-or text-encre text-sm font-medium rounded-full px-5 py-3 shadow-lg disabled:opacity-60"
          >
            {enCours ? 'Préparation…' : '❝ Partager cette citation'}
          </button>
        </div>
      )}
    </div>
  )
}
