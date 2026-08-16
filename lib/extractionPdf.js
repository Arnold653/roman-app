// Extraction du texte, des images et des tableaux d'un PDF, structurés en sections de lecture.
// Utilisé à la fois par l'admin (à l'upload, une seule fois) et par le lecteur public (pour les
// livres plus anciens pas encore passés par le nouveau flux d'upload).
import { niveauTitre, decouperEnSections, ressembleACitationAutonome } from './extractionCommune'

function extraireLignes(items) {
  if (!items.length) return []

  const seuilMemeLigne = 2
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

  lignesTmp.sort((a, b) => b.y - a.y)

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
    .filter((l) => !/^\d{1,4}$/.test(l.texte))
}

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

function ressembleATableau(bloc, tailleCorps) {
  if (bloc.length < 2 || bloc.some((l) => l.type !== 'texte')) return false
  const seuil = tailleCorps * 1.5
  const comptes = bloc.map((l) => decouperEnCellules(l.morceaux, seuil).length)
  if (comptes.filter((c) => c >= 2).length / bloc.length < 0.7) return false
  const freq = {}
  comptes.forEach((c) => { freq[c] = (freq[c] || 0) + 1 })
  return Math.max(...Object.values(freq)) / bloc.length >= 0.6
}

function ressembleAUnTitre(texte, taille, tailleCorps) {
  if (!texte || texte.length > 80) return false
  const grande = taille >= tailleCorps * 1.12
  const toutMajuscules = texte === texte.toUpperCase() && /[A-ZÀ-Ü]/.test(texte) && texte.length <= 70
  return grande || toutMajuscules
}

// Un bloc de plusieurs lignes peut être un titre qui a simplement été replié sur plusieurs
// lignes à cause d'une police plus grande (ex. le titre d'un chapitre sur 2-3 lignes) — on
// l'accepte si TOUTES ses lignes ont individuellement l'air d'un titre.
function blocRessembleAUnTitre(bloc, tailleCorps) {
  if (bloc.length < 1 || bloc.length > 4) return false
  return bloc.every((l) => ressembleAUnTitre(l.texte, l.taille, tailleCorps))
}

// Variante de niveauTitre() qui sait qu'on est déjà sûr (grâce à la taille de police réelle du
// PDF) d'être face à un titre : contrairement à niveauTitre(), qui doit se méfier d'un chiffre
// romain isolé sur une ligne de texte brut (souvent une initiale), ici un simple "I" ou "V" en
// gros caractères, seul sur sa ligne, est bien un numéro de chapitre.
// Un PDF ne porte aucune balise de titre (contrairement à DOCX/EPUB) : la seule information
// disponible pour approximer la profondeur d'un sous-titre (3 à 6) est sa taille de police
// relative au corps de texte — plus c'est gros, plus c'est haut dans la hiérarchie. Forcément
// approximatif ; à ajuster si des livres réels donnent des paliers mal calés.
function niveauTitrePdf(texte, taille, tailleCorps) {
  const t = texte.trim()
  if (/^[ivxlcdm]{1,4}\s*[.\-–—:]?\s*$/i.test(t) || /^\d{1,4}\s*[.\-–—:]?\s*$/.test(t)) return 2
  const n = niveauTitre(t)
  if (n <= 2 || !taille || !tailleCorps) return n
  const ratio = taille / tailleCorps
  if (ratio >= 1.5) return 3
  if (ratio >= 1.35) return 4
  if (ratio >= 1.2) return 5
  return 6
}

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
      // "Page N" (storybooks) : repère purement textuel, pas forcément plus gros que le corps —
      // reconnu par son contenu, indépendamment de la taille de police (contrairement à
      // ressembleAUnTitre, qui ne juge que sur l'apparence visuelle).
      const estRepereDePage = bloc.length === 1 && /^page\s+\d{1,4}\s*$/i.test(texte)
      const titre = estRepereDePage || (bloc.length === 1 && ressembleAUnTitre(texte, tailleMoyenne, tailleCorps)) || blocRessembleAUnTitre(bloc, tailleCorps)
      // Un PDF ne conserve pas l'info de style (italique, retrait) au niveau où on la lit ici,
      // donc pas de <blockquote> à détecter comme pour DOCX/EPUB — on retombe sur l'heuristique
      // guillemets + attribution, uniquement si le bloc n'a pas déjà été reconnu comme titre.
      const citation = !titre && ressembleACitationAutonome(texte)
      return { type: 'texte', texte, titre, niveau: titre ? niveauTitrePdf(texte, tailleMoyenne, tailleCorps) : null, citation }
    })
    .filter((p) => p.type !== 'texte' || p.texte.length > 0)
}

function fusionnerPages(paragraphesParPage) {
  const finPhrase = /[.!?…»"'”)\]]\s*$/
  const resultat = []

  for (const page of paragraphesParPage) {
    for (const p of page) {
      const precedent = resultat[resultat.length - 1]
      const fusionnable =
        p.type === 'texte' && !p.titre && !p.citation &&
        precedent?.type === 'texte' && !precedent.titre && !precedent.citation &&
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

// Reçoit une fonction de téléversement (nom, dataUrl) => url|null : permet à l'appelant de
// choisir où stocker les images (route publique pour le lecteur, route admin pour l'upload).
export async function extrairePdfDepuisUrl(url, televerserImage, onProgression) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`

  const doc = await pdfjsLib.getDocument(url).promise

  const lignesParPage = []
  const toutesLesTailles = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const contenu = await page.getTextContent()
    const lignes = extraireLignes(contenu.items)

    if (televerserImage) {
      const images = await extraireImagesPage(page, pdfjsLib)
      for (const img of images) {
        const nom = `p${i}-${Math.round(img.y)}-${Math.random().toString(36).slice(2, 7)}`
        const url2 = await televerserImage(nom, img.dataUrl)
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

  // Repère un éventuel bloc de métadonnées technique en tête de document (genre, tranche
  // d'âge/région, résumé) — le pendant PDF de l'en-tête ".md" (cf. lib/parseEnTete.js), pour
  // les documents (notamment les storybooks assemblés en PDF) qui embarquent ces informations
  // en toutes lettres, écrites en petit sous le titre de couverture, plutôt que de les laisser
  // à ressaisir à la main dans l'admin. Cherché uniquement dans les tout premiers blocs, avant
  // le début du texte réel — jamais plus loin, pour ne prendre aucun risque de faux positif.
  const metadonnees = { genre: '', region: '', trancheAge: '', description: '' }
  const indicesMetadonnees = []
  for (let i = 0; i < Math.min(paragraphesFusionnes.length, 10); i++) {
    const p = paragraphesFusionnes[i]
    if (i === 0 && p.type === 'texte' && p.titre) continue // le tout premier bloc, s'il est un titre, est le titre de l'ouvrage lui-même
    if (p.type !== 'texte') continue // image de couverture (ou autre) entre le titre et les métadonnées : on continue de chercher après
    const t = p.texte.trim()
    // Les 3 champs peuvent être 3 blocs séparés (une ligne chacun) OU avoir été fusionnés en un
    // seul paragraphe par l'extraction PDF (lignes rapprochées) — on gère les deux à la fois en
    // repérant chaque label présent dans le bloc et en découpant le texte entre labels successifs.
    const motifs = [
      ['genre', /genre\s*:/i],
      ['region', /r[ée]gion\s*:/i],
      ['trancheAge', /tranche\s*d.?[âa]ge\s*:/i],
      ['description', /(r[ée]sum[ée]|description)\s*:/i],
    ]
    const occurrences = []
    for (const [cle, regex] of motifs) {
      const m = t.match(regex)
      if (m) occurrences.push({ cle, index: m.index, fin: m.index + m[0].length })
    }
    if (occurrences.length === 0) break // ni le titre, ni une métadonnée reconnue : le texte réel commence
    occurrences.sort((a, b) => a.index - b.index)
    for (let k = 0; k < occurrences.length; k++) {
      const debut = occurrences[k].fin
      const fin = k + 1 < occurrences.length ? occurrences[k + 1].index : t.length
      metadonnees[occurrences[k].cle] = t.slice(debut, fin).trim()
    }
    indicesMetadonnees.push(i)
  }
  const paragraphesUtiles = indicesMetadonnees.length > 0
    ? paragraphesFusionnes.filter((_, i) => !indicesMetadonnees.includes(i))
    : paragraphesFusionnes

  const tableMatieres = paragraphesUtiles
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphesUtiles), tableMatieres, metadonnees }
}
