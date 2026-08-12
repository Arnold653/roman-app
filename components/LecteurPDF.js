'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CorpsChapitre from './CorpsChapitre'
import LectureAudio from './LectureAudio'

// Regroupe les items de texte d'une page PDF en lignes, selon leur coordonnée verticale
// (transform[5]). Chaque ligne garde ses morceaux bruts (texte + position + largeur), utilisés
// plus tard pour repérer les tableaux, et une taille de police moyenne, utilisée pour repérer
// les titres. Filtre au passage les lignes qui ne contiennent qu'un numéro de page isolé.
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
      return { type: 'texte', y: l.y, texte: texte.trim().replace(/\s+/g, ' '), taille, morceaux: l.morceaux }
    })
    .filter((l) => l.texte.length > 0)
    .filter((l) => !/^\d{1,4}$/.test(l.texte)) // numéro de page isolé
}

// Découpe les morceaux d'une ligne en "cellules" : un espacement horizontal nettement plus
// large qu'un simple espace entre mots (seuil dérivé de la taille du corps du texte) indique
// probablement une colonne de tableau plutôt qu'une continuation de phrase.
function decouperEnCellules(morceaux, seuil) {
  if (!morceaux.length) return []
  const cellules = []
  let texte = morceaux[0].texte
  let finPrecedent = morceaux[0].x + morceaux[0].largeur
  for (let i = 1; i < morceaux.length; i++) {
    const m = morceaux[i]
    if (m.x - finPrecedent > seuil) {
      cellules.push(texte.trim())
      texte = m.texte
    } else {
      texte += (m.x - finPrecedent > 1 && !texte.endsWith(' ') && !m.texte.startsWith(' ') ? ' ' : '') + m.texte
    }
    finPrecedent = m.x + m.largeur
  }
  cellules.push(texte.trim())
  return cellules.filter(Boolean)
}

// Un bloc ressemble à un tableau si la plupart de ses lignes se découpent en au moins deux
// cellules, avec un nombre de colonnes cohérent d'une ligne à l'autre. Heuristique basée sur
// la mise en page, pas une reconnaissance sémantique — imparfaite sur des tableaux irréguliers.
function ressembleATableau(bloc, tailleCorps) {
  if (bloc.length < 2 || bloc.some((l) => l.type !== 'texte')) return false
  const seuil = tailleCorps * 1.5
  const comptes = bloc.map((l) => decouperEnCellules(l.morceaux, seuil).length)
  if (comptes.filter((c) => c >= 2).length / bloc.length < 0.7) return false
  const freq = {}
  comptes.forEach((c) => { freq[c] = (freq[c] || 0) + 1 })
  return Math.max(...Object.values(freq)) / bloc.length >= 0.6
}

// Un titre ressemble presque toujours à une ligne isolée entre deux blancs plus grands que la
// normale, soit nettement plus grande que le corps du texte, soit courte et TOUT EN MAJUSCULES.
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

// Regroupe les lignes (texte + éventuelles images) d'une page en paragraphes selon l'écart
// vertical entre elles. Une image force toujours une frontière de part et d'autre (jamais
// mêlée à du texte). Un bloc de plusieurs lignes qui ressemble à un tableau devient un tableau ;
// un bloc d'une seule ligne qui ressemble à un titre devient un titre ; le reste, du texte normal.
function regrouperEnParagraphes(lignes, tailleCorps) {
  if (lignes.length === 0) return []

  const ecarts = []
  for (let i = 1; i < lignes.length; i++) ecarts.push(lignes[i - 1].y - lignes[i].y)
  const ecartsTries = [...ecarts].sort((a, b) => a - b)
  const ecartTypique = ecartsTries[Math.floor(ecartsTries.length / 2)] || 14

  const blocs = []
  let courant = [lignes[0]]
  for (let i = 1; i < lignes.length; i++) {
    const imagePresente = lignes[i].type === 'image' || lignes[i - 1].type === 'image'
    const ecart = lignes[i - 1].y - lignes[i].y
    if (imagePresente || ecart > ecartTypique * 1.6) {
      blocs.push(courant)
      courant = [lignes[i]]
    } else {
      courant.push(lignes[i])
    }
  }
  blocs.push(courant)

  return blocs
    .map((bloc) => {
      if (bloc.length === 1 && bloc[0].type === 'image') {
        return { type: 'image', url: bloc[0].url, texte: '', titre: false, niveau: null }
      }
      if (ressembleATableau(bloc, tailleCorps)) {
        const seuil = tailleCorps * 1.5
        const lignesTableau = bloc.map((l) => decouperEnCellules(l.morceaux, seuil))
        return { type: 'tableau', lignes: lignesTableau, texte: '', titre: false, niveau: null }
      }
      const texte = bloc.map((l) => l.texte).join(' ').replace(/\s+/g, ' ').trim()
      const tailleMoyenne = bloc.reduce((a, l) => a + l.taille, 0) / bloc.length
      const titre = bloc.length === 1 && ressembleAUnTitre(texte, tailleMoyenne, tailleCorps)
      return { type: 'texte', texte, titre, niveau: titre ? niveauTitre(texte) : null }
    })
    .filter((p) => p.type !== 'texte' || p.texte.length > 0)
}

// Recolle le dernier paragraphe d'une page avec le premier de la suivante quand tout indique
// qu'il s'agit de la même phrase coupée par le saut de page. Titres, images et tableaux ne sont
// jamais fusionnés (ni entre eux, ni avec du texte adjacent).
function fusionnerPages(paragraphesParPage) {
  const finPhrase = /[.!?…»"'”)\]]\s*$/
  const resultat = []

  for (const page of paragraphesParPage) {
    for (const p of page) {
      const precedent = resultat[resultat.length - 1]
      const fusionnable =
        p.type === 'texte' && !p.titre &&
        precedent?.type === 'texte' && !precedent.titre &&
        !finPhrase.test(precedent.texte)
      if (fusionnable) {
        resultat[resultat.length - 1] = { ...precedent, texte: precedent.texte + ' ' + p.texte }
      } else {
        resultat.push(p)
      }
    }
  }
  return resultat
}

function libellePastille(texte) {
  const t = texte.trim()
  const mChap = t.match(/^chapitre\s+(\d+)/i)
  if (mChap) return `Ch. ${mChap[1]}`
  const mPartie = t.match(/^partie\s+([ivxlcdm\d]+)/i)
  if (mPartie) return `Partie ${mPartie[1]}`
  const mots = t.split(/\s+/).slice(0, 2).join(' ')
  return mots.length > 16 ? mots.slice(0, 16) + '…' : mots
}

// Découpe le livre entier en "pages de lecture" aux frontières des titres de niveau 1 ou 2.
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

// Rend une page en canvas puis, en rejouant sa liste d'opérateurs, retrouve la position de
// chaque image dessinée (en suivant la pile save/restore/transform) pour découper la portion
// correspondante du canvas déjà rendu. Ignore les toutes petites images (puces, filets,
// logos minuscules) pour ne garder que les vraies illustrations/schémas/photos.
async function extraireImagesPage(page, pdfjsLib, echelle = 1.5) {
  const { OPS } = pdfjsLib
  const viewport = page.getViewport({ scale: echelle })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise

  const opList = await page.getOperatorList()

  function multiplier(m1, m2) {
    return [
      m1[0] * m2[0] + m1[1] * m2[2],
      m1[0] * m2[1] + m1[1] * m2[3],
      m1[2] * m2[0] + m1[3] * m2[2],
      m1[2] * m2[1] + m1[3] * m2[3],
      m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
      m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
    ]
  }

  let ctm = [1, 0, 0, 1, 0, 0]
  const pile = []
  const rectangles = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.save) {
      pile.push(ctm)
    } else if (fn === OPS.restore) {
      ctm = pile.pop() || [1, 0, 0, 1, 0, 0]
    } else if (fn === OPS.transform) {
      ctm = multiplier(args, ctm)
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintImageMaskXObject) {
      const coins = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [
        ctm[0] * x + ctm[2] * y + ctm[4],
        ctm[1] * x + ctm[3] * y + ctm[5],
      ])
      const xs = coins.map((c) => c[0])
      const ys = coins.map((c) => c[1])
      rectangles.push({ xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) })
    }
  }

  const images = []
  for (const rect of rectangles) {
    const [px1, py1] = viewport.convertToViewportPoint(rect.xMin, rect.yMax)
    const [px2, py2] = viewport.convertToViewportPoint(rect.xMax, rect.yMin)
    const largeur = Math.round(px2 - px1)
    const hauteur = Math.round(py2 - py1)
    if (largeur < 40 || hauteur < 40) continue

    const decoupe = document.createElement('canvas')
    decoupe.width = largeur
    decoupe.height = hauteur
    decoupe.getContext('2d').drawImage(canvas, px1, py1, largeur, hauteur, 0, 0, largeur, hauteur)
    images.push({ y: rect.yMin, dataUrl: decoupe.toDataURL('image/jpeg', 0.85) })
  }

  return images
}

async function televerserImage(slug, nom, dataUrl) {
  try {
    const res = await fetch(`/api/livres/${slug}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, dataUrl }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

// Extrait le texte (et les images) de tout le PDF et le structure en sections + table des matières.
async function extrairePdf(url, slug, onProgression) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`

  const doc = await pdfjsLib.getDocument(url).promise

  const lignesParPage = []
  const toutesLesTailles = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const contenu = await page.getTextContent()
    const lignes = extraireLignes(contenu.items)

    if (slug) {
      const images = await extraireImagesPage(page, pdfjsLib)
      for (const img of images) {
        const nom = `p${i}-${Math.round(img.y)}-${Math.random().toString(36).slice(2, 7)}`
        const url2 = await televerserImage(slug, nom, img.dataUrl)
        if (url2) lignes.push({ type: 'image', y: img.y, url: url2 })
      }
      lignes.sort((a, b) => b.y - a.y)
    }

    lignesParPage.push(lignes)
    for (const l of lignes) if (l.type === 'texte') toutesLesTailles.push(l.taille)
    onProgression?.(Math.round((i / doc.numPages) * 50))
  }

  const taillesTriees = [...toutesLesTailles].sort((a, b) => a - b)
  const tailleCorps = taillesTriees[Math.floor(taillesTriees.length / 2)] || 10

  const paragraphesParPage = lignesParPage.map((lignes, i) => {
    onProgression?.(50 + Math.round(((i + 1) / lignesParPage.length) * 50))
    return regrouperEnParagraphes(lignes, tailleCorps)
  })

  const paragraphesFusionnes = fusionnerPages(paragraphesParPage)
  const tableMatieres = paragraphesFusionnes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphesFusionnes), tableMatieres }
}

export default function LecteurPDF({ url, slug, livreId, contenuInitial, sectionInitiale = 0 }) {
  const [sections, setSections] = useState(contenuInitial?.sections || null)
  const [tableMatieres, setTableMatieres] = useState(contenuInitial?.tableMatieres || [])
  const [sectionIndex, setSectionIndex] = useState(sectionInitiale)
  const [chargement, setChargement] = useState(!contenuInitial)
  const [progression, setProgression] = useState(0)
  const [erreur, setErreur] = useState('')
  const [tocOuverte, setTocOuverte] = useState(false)
  const cibleScrollRef = useRef(null)
  const premierRenduRef = useRef(true)

  // Extraction côté client uniquement si aucun cache n'a été fourni par la page serveur
  // (c'est-à-dire au tout premier chargement de ce livre, par n'importe quel visiteur —
  // les suivants profitent directement du cache stocké en base et n'ont plus rien à parser).
  useEffect(() => {
    if (contenuInitial) return
    let annule = false

    async function charger() {
      try {
        const resultat = await extrairePdf(url, slug, (p) => { if (!annule) setProgression(p) })
        if (annule) return
        setTableMatieres(resultat.tableMatieres)
        setSections(resultat.sections)
        setChargement(false)

        if (slug) {
          fetch(`/api/livres/${slug}/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contenu: resultat }),
          }).catch(() => {})
        }
      } catch (e) {
        if (!annule) { setErreur(`Impossible de charger ce livre (${e?.message || e}).`); setChargement(false) }
      }
    }

    charger()
    return () => { annule = true }
  }, [url, slug, contenuInitial])

  // Mémorise la position de lecture pour l'utilisateur connecté, afin de reprendre au même
  // endroit à la prochaine ouverture.
  useEffect(() => {
    if (!sections) return
    if (premierRenduRef.current) { premierRenduRef.current = false; return }
    if (!livreId) return

    async function enregistrer() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('lecture_progress_livres').upsert({
        user_id: user.id,
        livre_id: livreId,
        derniere_section: sectionIndex,
        updated_at: new Date().toISOString(),
      })
    }
    enregistrer()
  }, [sectionIndex, sections, livreId])

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
    setTocOuverte(false)
  }

  if (erreur) return <p className="text-papier/40 text-sm font-mono py-6">{erreur}</p>

  if (chargement || !sections) {
    return (
      <div className="py-10">
        <p className="text-papier/35 text-sm font-mono">Préparation du texte... {progression}%</p>
      </div>
    )
  }

  const indexEffectif = Math.min(sectionIndex, sections.length - 1)
  const section = sections[indexEffectif]

  const texteSection = section.blocs
    .map((p) => {
      if (p.type === 'image') return `§IMAGE§${p.url}`
      if (p.type === 'tableau') return `§TABLEAU§${JSON.stringify(p.lignes)}`
      return p.titre ? `§TITRE§${p.texte}` : p.texte
    })
    .join('\n\n')

  const titreAudio = section.blocs[0]?.type === 'texte' && section.blocs[0]?.titre ? section.blocs[0].texte : ''
  const texteAudio = (titreAudio ? section.blocs.slice(1) : section.blocs)
    .filter((p) => p.type === 'texte')
    .map((p) => p.texte)
    .join('\n\n')

  return (
    <div>
      {tableMatieres.length > 1 && (
        <div className="mb-8">
          <button
            onClick={() => setTocOuverte((v) => !v)}
            className="text-xs font-mono uppercase tracking-widest text-papier/50 hover:text-or transition-colors border border-ligne rounded-full px-3 py-1.5"
          >
            Table des matières {tocOuverte ? '▴' : '▾'}
          </button>
          {tocOuverte && (
            <div className="border border-ligne rounded-lg p-4 mt-2">
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
        </div>
      )}

      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setSectionIndex(i)}
              className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                i === indexEffectif ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
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
          {indexEffectif > 0 ? (
            <button onClick={() => setSectionIndex(indexEffectif - 1)} className="text-papier/50 hover:text-or transition-colors">
              ← {sections[indexEffectif - 1].pilLabel}
            </button>
          ) : <span />}
          {indexEffectif < sections.length - 1 ? (
            <button onClick={() => setSectionIndex(indexEffectif + 1)} className="text-papier/50 hover:text-or transition-colors">
              {sections[indexEffectif + 1].pilLabel} →
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
