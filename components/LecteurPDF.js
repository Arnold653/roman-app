'use client'

import { useEffect, useRef, useState } from 'react'
import CorpsChapitre from './CorpsChapitre'
import LectureAudio from './LectureAudio'

// Regroupe les items de texte d'une page PDF en lignes, selon leur coordonnée verticale
// (transform[5]). Chaque ligne garde aussi une taille de police approximative (dérivée de la
// matrice de transformation de ses items), utilisée plus tard pour repérer les titres.
// Filtre au passage les lignes qui ne contiennent qu'un numéro de page isolé.
function extraireLignes(items) {
  if (!items.length) return []

  const seuilMemeLigne = 2 // tolérance en points pour considérer deux items sur la même ligne
  const lignesTmp = []
  for (const item of items) {
    const y = item.transform[5]
    const x = item.transform[4]
    const taille = Math.abs(item.transform[3]) || item.height || 10
    let ligne = lignesTmp.find((l) => Math.abs(l.y - y) < seuilMemeLigne)
    if (!ligne) {
      ligne = { y, morceaux: [], tailles: [] }
      lignesTmp.push(ligne)
    }
    ligne.morceaux.push({ x, texte: item.str, largeur: item.width || 0 })
    if (item.str.trim()) ligne.tailles.push(taille)
  }

  lignesTmp.sort((a, b) => b.y - a.y) // haut de page en premier (y décroît vers le bas en coordonnées PDF)

  return lignesTmp
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
      const taille = l.tailles.length ? l.tailles.reduce((a, b) => a + b, 0) / l.tailles.length : 10
      return { y: l.y, texte: texte.trim().replace(/\s+/g, ' '), taille }
    })
    .filter((l) => l.texte.length > 0)
    .filter((l) => !/^\d{1,4}$/.test(l.texte)) // numéro de page isolé
}

// Un titre ressemble presque toujours à une ligne isolée entre deux blancs plus grands que la
// normale, soit nettement plus grande que le corps du texte, soit courte et TOUT EN MAJUSCULES.
// C'est une heuristique basée sur la mise en page, pas une analyse sémantique du document.
function ressembleAUnTitre(texte, taille, tailleCorps) {
  if (!texte || texte.length > 80) return false
  const grande = taille >= tailleCorps * 1.12
  const toutMajuscules = texte === texte.toUpperCase() && /[A-ZÀ-Ü]/.test(texte) && texte.length <= 70
  return grande || toutMajuscules
}

// Niveau hiérarchique d'un titre détecté : 1 = grande division (Partie/Section), 2 = chapitre
// ou grand bloc éditorial (dédicace, avant-propos, introduction, bonus...) qui démarre une
// nouvelle "page" de lecture, 3 = simple sous-titre affiché à l'intérieur d'une page.
function niveauTitre(texte) {
  const t = texte.trim()
  if (/^(partie|section)\s*[ivxlcdm\d]*\b/i.test(t)) return 1
  if (/^(chapitre|d[ée]dicace|avant[- ]propos|introduction|pr[ée]face|prologue|[ée]pilogue|conclusion|remerciements|annexe|bonus)\b/i.test(t)) return 2
  return 3
}

// Regroupe les lignes d'une page en paragraphes selon l'écart vertical entre elles (un écart
// nettement plus grand que la normale = saut de paragraphe), en isolant les titres détectés.
function regrouperEnParagraphes(lignes, tailleCorps) {
  if (lignes.length === 0) return []

  const ecarts = []
  for (let i = 1; i < lignes.length; i++) ecarts.push(lignes[i - 1].y - lignes[i].y)
  const ecartsTries = [...ecarts].sort((a, b) => a - b)
  const ecartTypique = ecartsTries[Math.floor(ecartsTries.length / 2)] || 14

  const blocs = []
  let courant = [lignes[0]]
  for (let i = 1; i < lignes.length; i++) {
    const ecart = lignes[i - 1].y - lignes[i].y
    if (ecart > ecartTypique * 1.6) {
      blocs.push(courant)
      courant = [lignes[i]]
    } else {
      courant.push(lignes[i])
    }
  }
  blocs.push(courant)

  return blocs.map((bloc) => {
    const texte = bloc.map((l) => l.texte).join(' ').replace(/\s+/g, ' ').trim()
    const tailleMoyenne = bloc.reduce((a, l) => a + l.taille, 0) / bloc.length
    // Un titre est presque toujours seul dans son bloc (une ligne entourée de blancs)
    const titre = bloc.length === 1 && ressembleAUnTitre(texte, tailleMoyenne, tailleCorps)
    return { texte, titre, niveau: titre ? niveauTitre(texte) : null }
  }).filter((p) => p.texte.length > 0)
}

// Recolle le dernier paragraphe d'une page avec le premier de la suivante quand tout indique
// qu'il s'agit de la même phrase coupée par le saut de page. Les titres ne sont jamais fusionnés.
function fusionnerPages(paragraphesParPage) {
  const finPhrase = /[.!?…»"'”)\]]\s*$/
  const resultat = []

  for (const page of paragraphesParPage) {
    for (const p of page) {
      const precedent = resultat[resultat.length - 1]
      if (!p.titre && precedent && !precedent.titre && !finPhrase.test(precedent.texte)) {
        resultat[resultat.length - 1] = { ...precedent, texte: precedent.texte + ' ' + p.texte }
      } else {
        resultat.push(p)
      }
    }
  }
  return resultat
}

// Un libellé court pour la pastille de navigation, à partir du titre détecté.
function libellePastille(texte) {
  const t = texte.trim()
  const mChap = t.match(/^chapitre\s+(\d+)/i)
  if (mChap) return `Ch. ${mChap[1]}`
  const mPartie = t.match(/^partie\s+([ivxlcdm\d]+)/i)
  if (mPartie) return `Partie ${mPartie[1]}`
  const mots = t.split(/\s+/).slice(0, 2).join(' ')
  return mots.length > 16 ? mots.slice(0, 16) + '…' : mots
}

// Découpe le livre entier en "pages de lecture" aux frontières des titres de niveau 1 ou 2
// (Partie, Chapitre, Dédicace, Avant-propos...), pour éviter un défilement infini.
function decouperEnSections(paragraphes) {
  const frontieres = paragraphes
    .map((p, i) => ({ titre: p.titre, niveau: p.niveau, i }))
    .filter((p) => p.titre && p.niveau <= 2)
    .map((p) => p.i)

  const bornes = frontieres[0] === 0 ? frontieres : [0, ...frontieres]

  return bornes.map((debut, k) => {
    const fin = k + 1 < bornes.length ? bornes[k + 1] : paragraphes.length
    const blocs = paragraphes.slice(debut, fin)
    const premierEstTitre = blocs[0]?.titre && blocs[0].niveau <= 2
    return {
      debut,
      fin,
      blocs,
      pilLabel: premierEstTitre ? libellePastille(blocs[0].texte) : 'Début',
    }
  })
}

export default function LecteurPDF({ url }) {
  const [sections, setSections] = useState(null)
  const [tableMatieres, setTableMatieres] = useState([])
  const [sectionIndex, setSectionIndex] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [progression, setProgression] = useState(0)
  const [erreur, setErreur] = useState('')
  const cibleScrollRef = useRef(null)

  useEffect(() => {
    let annule = false

    async function charger() {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`

        const doc = await pdfjsLib.getDocument(url).promise
        if (annule) return

        // Première passe : on récupère toutes les lignes de toutes les pages pour établir
        // une taille de police "corps du texte" de référence sur l'ensemble du livre, avant
        // de pouvoir décider quelles lignes sont des titres.
        const lignesParPage = []
        const toutesLesTailles = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const contenu = await page.getTextContent()
          const lignes = extraireLignes(contenu.items)
          lignesParPage.push(lignes)
          for (const l of lignes) toutesLesTailles.push(l.taille)
          if (!annule) setProgression(Math.round((i / doc.numPages) * 50))
        }
        if (annule) return

        const taillesTriees = [...toutesLesTailles].sort((a, b) => a - b)
        const tailleCorps = taillesTriees[Math.floor(taillesTriees.length / 2)] || 10

        const paragraphesParPage = lignesParPage.map((lignes, i) => {
          if (!annule) setProgression(50 + Math.round(((i + 1) / lignesParPage.length) * 50))
          return regrouperEnParagraphes(lignes, tailleCorps)
        })
        if (annule) return

        const paragraphesFusionnes = fusionnerPages(paragraphesParPage)
        const toc = paragraphesFusionnes
          .map((p, i) => ({ ...p, i }))
          .filter((p) => p.titre)
          .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

        setTableMatieres(toc)
        setSections(decouperEnSections(paragraphesFusionnes))
        setChargement(false)
      } catch (e) {
        if (!annule) { setErreur(`Impossible de charger ce livre (${e?.message || e}).`); setChargement(false) }
      }
    }

    charger()
    return () => { annule = true }
  }, [url])

  // Après un changement de section (depuis la table des matières ou les pastilles), on remonte
  // en haut, ou on défile jusqu'au sous-titre précis visé s'il y en avait un.
  useEffect(() => {
    if (!sections) return
    const id = cibleScrollRef.current
    cibleScrollRef.current = null
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [sectionIndex, sections])

  function allerAuTitre(indexGlobal) {
    const k = sections.findIndex((s) => indexGlobal >= s.debut && indexGlobal < s.fin)
    if (k === -1) return
    const idLocal = `p-${indexGlobal - sections[k].debut}`
    cibleScrollRef.current = idLocal
    setSectionIndex(k)
  }

  if (erreur) return <p className="text-papier/40 text-sm font-mono py-6">{erreur}</p>

  if (chargement || !sections) {
    return (
      <div className="py-10">
        <p className="text-papier/35 text-sm font-mono">Préparation du texte... {progression}%</p>
      </div>
    )
  }

  const section = sections[sectionIndex]
  const texteSection = section.blocs.map((p) => (p.titre ? `§TITRE§${p.texte}` : p.texte)).join('\n\n')

  // Pour la lecture audio : le titre de la section (lu séparément par LectureAudio) et le reste
  // du texte, sans marqueurs de mise en forme.
  const titreAudio = section.blocs[0]?.titre ? section.blocs[0].texte : ''
  const texteAudio = (titreAudio ? section.blocs.slice(1) : section.blocs).map((p) => p.texte).join('\n\n')

  return (
    <div>
      {tableMatieres.length > 1 && (
        <div className="border border-ligne rounded-lg p-4 mb-8">
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-3">Table des matières</p>
          <ul className="space-y-1.5">
            {tableMatieres.map((t) => (
              <li key={t.index} style={{ paddingLeft: `${(t.niveau - 1) * 14}px` }}>
                <button
                  onClick={() => allerAuTitre(t.index)}
                  className={`text-left transition-colors hover:text-or ${
                    t.niveau === 1
                      ? 'text-papier/85 text-sm font-semibold uppercase tracking-wide'
                      : t.niveau === 2
                      ? 'text-papier/70 text-sm'
                      : 'text-papier/40 text-xs italic'
                  }`}
                >
                  {t.texte}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setSectionIndex(i)}
              className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                i === sectionIndex ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
              }`}
            >
              {s.pilLabel}
            </button>
          ))}
        </div>
      )}

      <div className="mb-8">
        <LectureAudio texte={texteAudio} titre={titreAudio} />
      </div>

      <CorpsChapitre texte={texteSection} />

      {sections.length > 1 && (
        <div className="flex items-center justify-between mt-16 pt-8 border-t border-ligne font-mono text-sm">
          {sectionIndex > 0 ? (
            <button onClick={() => setSectionIndex(sectionIndex - 1)} className="text-papier/50 hover:text-or transition-colors">
              ← {sections[sectionIndex - 1].pilLabel}
            </button>
          ) : <span />}
          {sectionIndex < sections.length - 1 ? (
            <button onClick={() => setSectionIndex(sectionIndex + 1)} className="text-papier/50 hover:text-or transition-colors">
              {sections[sectionIndex + 1].pilLabel} →
            </button>
          ) : <span />}
        </div>
      )}

      <p className="text-papier/25 text-xs font-mono mt-8 text-center">
        Texte extrait automatiquement du PDF d'origine — de rares écarts de mise en forme sont possibles selon la mise en page source.
      </p>
    </div>
  )
}
