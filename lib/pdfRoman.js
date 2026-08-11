import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const LARGEUR = 595.28 // A4
const HAUTEUR = 841.89
const MARGE = 56
const LARGEUR_TEXTE = LARGEUR - MARGE * 2

function nettoyerTexte(texte) {
  return (texte || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/#(.+?)#/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^(---+|\*\*\*+|___+)$/gm, '')
}

function decouperEnParagraphes(texte) {
  return nettoyerTexte(texte)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

// Découpe une chaîne en lignes qui tiennent dans `largeurMax`, pour une police/taille données.
function envelopper(font, taille, texte, largeurMax) {
  const mots = texte.split(/\s+/)
  const lignes = []
  let ligne = ''

  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (font.widthOfTextAtSize(essai, taille) > largeurMax && ligne) {
      lignes.push(ligne)
      ligne = mot
    } else {
      ligne = essai
    }
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

export async function genererPdfRoman({ titre, resume, genre, chapitres }) {
  const doc = await PDFDocument.create()
  doc.setTitle(titre)
  doc.setProducer('Encre')
  doc.setAuthor('Encre')

  const police = await doc.embedFont(StandardFonts.TimesRoman)
  const policeGrasse = await doc.embedFont(StandardFonts.TimesRomanBold)
  const policeItalique = await doc.embedFont(StandardFonts.TimesRomanItalic)

  let page = doc.addPage([LARGEUR, HAUTEUR])
  let y = HAUTEUR - MARGE

  function nouvellePage() {
    page = doc.addPage([LARGEUR, HAUTEUR])
    y = HAUTEUR - MARGE
  }

  function assurerEspace(hauteurNecessaire) {
    if (y - hauteurNecessaire < MARGE) nouvellePage()
  }

  function ecrireLigne(texte, { taille = 11, font = police, interligne = 16, couleur = rgb(0.1, 0.1, 0.12), indentation = 0 } = {}) {
    assurerEspace(interligne)
    page.drawText(texte, { x: MARGE + indentation, y: y - taille, size: taille, font, color: couleur })
    y -= interligne
  }

  function ecrireParagraphe(texte, options = {}) {
    const { taille = 11.5, font = police, interligne = 17 } = options
    const lignes = envelopper(font, taille, texte, LARGEUR_TEXTE - (options.indentation || 0))
    for (const ligne of lignes) {
      ecrireLigne(ligne, { ...options, taille, font, interligne })
    }
  }

  // --- Page de titre ---
  y = HAUTEUR / 2 + 60
  const tailleTitre = 26
  const lignesTitre = envelopper(policeGrasse, tailleTitre, titre.toUpperCase(), LARGEUR_TEXTE)
  for (const l of lignesTitre) {
    const largeur = policeGrasse.widthOfTextAtSize(l, tailleTitre)
    page.drawText(l, { x: (LARGEUR - largeur) / 2, y: y - tailleTitre, size: tailleTitre, font: policeGrasse, color: rgb(0, 0.28, 0.75) })
    y -= tailleTitre + 8
  }
  y -= 20
  if (genre) {
    const txt = genre.toUpperCase()
    const largeur = police.widthOfTextAtSize(txt, 10)
    page.drawText(txt, { x: (LARGEUR - largeur) / 2, y: y - 10, size: 10, font: police, color: rgb(0.5, 0.5, 0.5) })
    y -= 30
  }
  if (resume) {
    y -= 20
    const lignesResume = envelopper(policeItalique, 12, resume, LARGEUR_TEXTE - 80)
    for (const l of lignesResume) {
      const largeur = policeItalique.widthOfTextAtSize(l, 12)
      page.drawText(l, { x: (LARGEUR - largeur) / 2, y: y - 12, size: 12, font: policeItalique, color: rgb(0.35, 0.35, 0.38) })
      y -= 19
    }
  }

  const piedTitre = 'Publié sur Encre'
  const largeurPied = police.widthOfTextAtSize(piedTitre, 9)
  page.drawText(piedTitre, { x: (LARGEUR - largeurPied) / 2, y: MARGE, size: 9, font: police, color: rgb(0.6, 0.6, 0.6) })

  // --- Chapitres ---
  for (const chap of chapitres) {
    nouvellePage()

    ecrireLigne(`CHAPITRE ${chap.numero}`, { taille: 10, font: police, couleur: rgb(0.55, 0.55, 0.58), interligne: 16 })
    if (chap.titre) {
      y -= 4
      const lignesTitreChap = envelopper(policeGrasse, 19, chap.titre, LARGEUR_TEXTE)
      for (const l of lignesTitreChap) ecrireLigne(l, { taille: 19, font: policeGrasse, interligne: 25 })
    }
    y -= 14

    const paragraphes = decouperEnParagraphes(chap.contenu)
    for (const p of paragraphes) {
      const estDialogue = /^[—–-]\s/.test(p)
      ecrireParagraphe(p, { indentation: estDialogue ? 14 : 0 })
      y -= 6
    }

    if (chap.citation_fin) {
      y -= 10
      const lignesCitation = envelopper(policeItalique, 11.5, chap.citation_fin, LARGEUR_TEXTE - 30)
      for (const l of lignesCitation) ecrireLigne(l, { taille: 11.5, font: policeItalique, interligne: 17, indentation: 20, couleur: rgb(0.4, 0.4, 0.42) })
    }
  }

  // Pagination
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    if (i === 0) return
    const txt = String(i + 1)
    const largeur = police.widthOfTextAtSize(txt, 9)
    p.drawText(txt, { x: (LARGEUR - largeur) / 2, y: MARGE - 22, size: 9, font: police, color: rgb(0.6, 0.6, 0.6) })
  })

  return doc.save()
}
