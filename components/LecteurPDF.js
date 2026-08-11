'use client'

import { useEffect, useState } from 'react'
import CorpsChapitre from './CorpsChapitre'

// Regroupe les items de texte d'une page PDF (position par position) en lignes, selon leur
// coordonnée verticale (transform[5]), puis en paragraphes selon l'écart vertical entre les
// lignes : un écart nettement plus grand que la normale = saut de paragraphe, sinon les lignes
// sont recollées en texte continu (c'est ce qui permet le "texte qui coule" au lieu de pages figées).
// Filtre au passage les lignes qui ne contiennent qu'un numéro de page isolé.
// Ceci est une heuristique basée sur la mise en page du PDF, pas une extraction sémantique :
// le résultat peut être imparfait selon la façon dont le PDF source a été généré.
function extraireParagraphes(items) {
  if (!items.length) return []

  const seuilMemeigne = 2 // tolérance en points pour considérer deux items sur la même ligne
  const lignesTmp = []
  for (const item of items) {
    const y = item.transform[5]
    const x = item.transform[4]
    let ligne = lignesTmp.find((l) => Math.abs(l.y - y) < seuilMemeigne)
    if (!ligne) {
      ligne = { y, morceaux: [] }
      lignesTmp.push(ligne)
    }
    ligne.morceaux.push({ x, texte: item.str, largeur: item.width || 0 })
  }

  lignesTmp.sort((a, b) => b.y - a.y) // haut de page en premier (y décroît vers le bas en coordonnées PDF)

  const lignes = lignesTmp
    .map((l) => {
      l.morceaux.sort((a, b) => a.x - b.x)
      let texte = ''
      let finPrecedent = null
      for (const m of l.morceaux) {
        if (finPrecedent !== null && m.x - finPrecedent > 1 && texte && !texte.endsWith(' ') && !m.texte.startsWith(' ')) {
          texte += ' '
        }
        texte += m.texte
        finPrecedent = m.x + m.largeur
      }
      return { y: l.y, texte: texte.trim() }
    })
    .filter((l) => l.texte.length > 0)
    .filter((l) => !/^\d{1,4}$/.test(l.texte)) // numéro de page isolé

  if (lignes.length === 0) return []

  const ecarts = []
  for (let i = 1; i < lignes.length; i++) ecarts.push(lignes[i - 1].y - lignes[i].y)
  const ecartsTries = [...ecarts].sort((a, b) => a - b)
  const ecartTypique = ecartsTries[Math.floor(ecartsTries.length / 2)] || 14

  const paragraphes = []
  let courant = lignes[0].texte
  for (let i = 1; i < lignes.length; i++) {
    const ecart = lignes[i - 1].y - lignes[i].y
    if (ecart > ecartTypique * 1.6) {
      paragraphes.push(courant)
      courant = lignes[i].texte
    } else {
      courant += ' ' + lignes[i].texte
    }
  }
  if (courant) paragraphes.push(courant)

  return paragraphes.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

// Recolle le dernier paragraphe d'une page avec le premier de la suivante quand tout indique
// qu'il s'agit de la même phrase coupée par le saut de page (le paragraphe précédent ne se
// termine pas par une ponctuation de fin de phrase, et n'est pas un titre en capitales).
function fusionnerPages(paragraphesParPage) {
  const finPhrase = /[.!?…»"'”)\]]\s*$/
  const toutMajuscules = /^[A-ZÀ-Ü0-9\s.,'"-]{4,}$/
  const resultat = []

  for (const page of paragraphesParPage) {
    for (const p of page) {
      const precedent = resultat[resultat.length - 1]
      if (precedent && !finPhrase.test(precedent) && !toutMajuscules.test(precedent)) {
        resultat[resultat.length - 1] = precedent + ' ' + p
      } else {
        resultat.push(p)
      }
    }
  }
  return resultat
}

export default function LecteurPDF({ url }) {
  const [texte, setTexte] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [progression, setProgression] = useState(0)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false

    async function charger() {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`

        const doc = await pdfjsLib.getDocument(url).promise
        if (annule) return

        const paragraphesParPage = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const contenu = await page.getTextContent()
          paragraphesParPage.push(extraireParagraphes(contenu.items))
          if (!annule) setProgression(Math.round((i / doc.numPages) * 100))
        }
        if (annule) return

        const paragraphesFusionnes = fusionnerPages(paragraphesParPage)
        setTexte(paragraphesFusionnes.join('\n\n'))
        setChargement(false)
      } catch (e) {
        if (!annule) { setErreur(`Impossible de charger ce livre (${e?.message || e}).`); setChargement(false) }
      }
    }

    charger()
    return () => { annule = true }
  }, [url])

  if (erreur) return <p className="text-papier/40 text-sm font-mono py-6">{erreur}</p>

  if (chargement) {
    return (
      <div className="py-10">
        <p className="text-papier/35 text-sm font-mono">Préparation du texte... {progression}%</p>
      </div>
    )
  }

  return (
    <div>
      <CorpsChapitre texte={texte} />
      <p className="text-papier/25 text-xs font-mono mt-8 text-center">
        Texte extrait automatiquement du PDF d'origine — de rares écarts de mise en forme sont possibles selon la mise en page source.
      </p>
    </div>
  )
}
