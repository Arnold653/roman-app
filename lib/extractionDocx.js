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

  const paragraphes = []
  doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote').forEach((el) => {
    // Un <blockquote> généré par le style map ci-dessus enveloppe un <p> enfant : on capture
    // le texte au niveau du blockquote, donc on ignore ce <p> pour ne pas le compter deux fois.
    if (el.tagName === 'P' && el.parentElement?.tagName === 'BLOCKQUOTE') return

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

  return { sections: decouperEnSections(paragraphes), tableMatieres, paragraphes }
}
