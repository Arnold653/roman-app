// Extraction du texte, des images et des tableaux d'un PDF, structurés en sections de lecture.
// Utilisé à la fois par l'admin (à l'upload, une seule fois) et par le lecteur public (pour les
// livres plus anciens pas encore passés par le nouveau flux d'upload).
import { niveauTitre, decouperEnSections } from './extractionCommune'

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
function niveauTitrePdf(texte) {
  const t = texte.trim()
  if (/^[ivxlcdm]{1,4}\s*[.\-–—:]?\s*$/i.test(t) || /^\d{1,4}\s*[.\-–—:]?\s*$/.test(t)) return 2
  return niveauTitre(texte)
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
      const titre = (bloc.length === 1 && ressembleAUnTitre(texte, tailleMoyenne, tailleCorps)) || blocRessembleAUnTitre(bloc, tailleCorps)
      return { type: 'texte', texte, titre, niveau: titre ? niveauTitrePdf(texte) : null }
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
  const tableMatieres = paragraphesFusionnes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphesFusionnes), tableMatieres }
}
