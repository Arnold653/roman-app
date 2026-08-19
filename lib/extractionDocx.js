// Extraction pour les fichiers .docx — pendant de extractionTexte.js (.md/.txt) et
// extractionPdf.js (.pdf). mammoth convertit le docx en HTML en conservant les titres
// (Heading 1/2/3 Word → <h1>/<h2>/<h3>) ; on parcourt ensuite ce HTML pour reconstruire la
// même structure de paragraphes que les autres extracteurs, afin de réutiliser telle quelle
// la logique de découpage en sections (decouperEnSections).
import mammoth from 'mammoth'
import { decouperEnSections, niveauTitre, ressembleACitationAutonome } from './extractionCommune'

// Fait correspondre les styles de paragraphe Word habituellement utilisés pour une citation
// mise en exergue (menu Accueil > Styles, noms FR et EN selon la langue d'installation de
// Word) à un vrai <blockquote> HTML, en plus du mapping par défaut de mammoth pour les titres.
const STYLE_MAP = [
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
  "p[style-name='Citation'] => blockquote:fresh",
  "p[style-name='Citation intense'] => blockquote:fresh",
]

export async function extraireDocx(arrayBuffer) {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: STYLE_MAP })
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Sous-titre de l'ouvrage : convention de page de titre — un paragraphe entièrement en gras
  // (le titre) immédiatement suivi d'un paragraphe entièrement en italique (le sous-titre),
  // avant tout titre de section. Une fois capturé, ce paragraphe est retiré du corps de lecture
  // (il est déjà représenté par le champ sous_titre du livre, affiché sous le titre principal).
  let sousTitreDetecte = null
  let sousTitreElement = null
  const enfants = Array.from(doc.body.children)
  const premierTitreIdx = enfants.findIndex((el) => /^H[1-6]$/.test(el.tagName))
  const avantSection = premierTitreIdx === -1 ? enfants : enfants.slice(0, premierTitreIdx)
  for (let i = 0; i < avantSection.length - 1; i++) {
    const a = avantSection[i]
    const b = avantSection[i + 1]
    const aEstTitreGras = a.tagName === 'P' && a.children.length === 1 && a.children[0].tagName === 'STRONG' && a.textContent.trim()
    const bEstSousTitreItalique = b.tagName === 'P' && b.children.length === 1 && b.children[0].tagName === 'EM' && b.textContent.trim()
    if (aEstTitreGras && bEstSousTitreItalique) {
      sousTitreDetecte = b.textContent.replace(/\s+/g, ' ').trim()
      sousTitreElement = b
      break
    }
  }

  const paragraphes = []
  doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, table').forEach((el) => {
    // Un <blockquote> généré par le style map ci-dessus enveloppe un <p> enfant : on capture
    // le texte au niveau du blockquote, donc on ignore ce <p> pour ne pas le compter deux fois.
    if (el.tagName === 'P' && el.parentElement?.tagName === 'BLOCKQUOTE') return
    // Un <p> à l'intérieur d'un <table> est capturé via le <table> lui-même (encadré ou
    // tableau, cf. ci-dessous) — on l'ignore ici pour ne pas le compter deux fois.
    if (el.tagName === 'P' && el.closest('td, th')) return
    if (el === sousTitreElement) return

    if (el.tagName === 'TABLE') {
      // Un tableau Word à une seule ligne et une seule cellule est, en pratique, toujours un
      // encadré éditorial ("À retenir", astuce, avertissement...) plutôt qu'un vrai tableau de
      // données — Word n'a pas de style "encadré" natif, ce détour par un tableau à une cellule
      // avec fond de couleur est la façon habituelle de le simuler. Un tableau à plusieurs
      // lignes ou colonnes reste traité comme un vrai tableau.
      const lignesTr = Array.from(el.querySelectorAll('tr'))
      if (lignesTr.length === 1 && lignesTr[0].querySelectorAll('td, th').length === 1) {
        const cellule = lignesTr[0].querySelector('td, th')
        const parasCellule = Array.from(cellule.querySelectorAll('p'))
        const textesCellule = parasCellule.map((p) => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)
        if (textesCellule.length === 0) return
        const premierEstGras = parasCellule[0]?.children.length === 1 && parasCellule[0].children[0].tagName === 'STRONG'
        const encadreTitre = premierEstGras ? textesCellule[0] : ''
        const encadreTexte = (premierEstGras ? textesCellule.slice(1) : textesCellule).join(' ')
        if (!encadreTexte) return
        paragraphes.push({ type: 'texte', texte: encadreTexte, titre: false, niveau: null, encadre: true, encadreTitre })
        return
      }
      const donnees = lignesTr.map((tr) => Array.from(tr.querySelectorAll('td, th')).map((c) => c.textContent.replace(/\s+/g, ' ').trim()))
      if (donnees.length > 0) paragraphes.push({ type: 'tableau', lignes: donnees })
      return
    }

    const texte = el.textContent.replace(/\s+/g, ' ').trim()
    if (!texte) return
    if (/^H[1-6]$/.test(el.tagName)) {
      // Le niveau se décide d'abord sur le CONTENU ("Chapitre 4", "Partie II"...), la
      // profondeur de balise Word (H1-H6) ne servant de repli que pour les sous-titres qui
      // n'ont pas de vocabulaire particulier — trop irrégulière d'un document à l'autre pour
      // trancher seule entre Partie et Chapitre.
      const profondeur = Number(el.tagName.slice(1))
      paragraphes.push({ type: 'texte', texte, titre: true, niveau: niveauTitre(texte, profondeur) })
    } else if (el.tagName === 'BLOCKQUOTE') {
      paragraphes.push({ type: 'texte', texte, titre: false, niveau: null, citation: true })
    } else if (ressembleACitationAutonome(texte)) {
      // Repli pour une citation qui n'a pas été mise en forme avec un style Word dédié.
      paragraphes.push({ type: 'texte', texte, titre: false, niveau: null, citation: true })
    } else {
      paragraphes.push({ type: 'texte', texte, titre: false, niveau: null })
    }
  })

  const tableMatieres = paragraphes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphes), tableMatieres, paragraphes, sousTitreDetecte }
}
