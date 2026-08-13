// Extraction pour les fichiers .docx — pendant de extractionTexte.js (.md/.txt) et
// extractionPdf.js (.pdf). mammoth convertit le docx en HTML en conservant les titres
// (Heading 1/2/3 Word → <h1>/<h2>/<h3>) ; on parcourt ensuite ce HTML pour reconstruire la
// même structure de paragraphes que les autres extracteurs, afin de réutiliser telle quelle
// la logique de découpage en sections (decouperEnSections).
import mammoth from 'mammoth'
import { decouperEnSections, niveauTitre } from './extractionCommune'

export async function extraireDocx(arrayBuffer) {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const paragraphes = []
  doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    const texte = el.textContent.replace(/\s+/g, ' ').trim()
    if (!texte) return
    if (/^H[1-6]$/.test(el.tagName)) {
      // Le niveau se décide sur le CONTENU ("Chapitre 4", "Partie II"...), pas sur la
      // profondeur de balise Word — trop irrégulière d'un document à l'autre pour s'y fier.
      paragraphes.push({ type: 'texte', texte, titre: true, niveau: niveauTitre(texte) })
    } else {
      paragraphes.push({ type: 'texte', texte, titre: false, niveau: null })
    }
  })

  const tableMatieres = paragraphes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphes), tableMatieres, paragraphes }
}
