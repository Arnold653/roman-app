// Découpe un texte brut (.md ou .txt) en paragraphes structurés, avec détection de titres —
// pendant de extractionPdf.js mais sans information de taille de police : on s'appuie sur la
// syntaxe Markdown (# ##...) quand elle est présente, puis sur les mêmes heuristiques que pour
// le PDF (ligne isolée courte, TOUT EN MAJUSCULES, ou repère de chapitre reconnu) en dernier recours.
import {
  niveauTitre,
  decouperEnSections,
  estMarqueurCitation,
  retirerMarqueurCitation,
  ressembleACitationAutonome,
} from './extractionCommune'

export function extraireTexteBrut(brut) {
  const texte = brut.replace(/\r\n/g, '\n').trim()
  const blocs = texte.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)

  const paragraphes = blocs
    .map((bloc) => {
      const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean)
      const uneLigne = lignes.length === 1

      // Bloc de citation Markdown explicite : toutes les lignes du bloc sont préfixées par
      // ">" — convention universelle (épigraphe, extrait mis en exergue).
      if (lignes.length > 0 && lignes.every((l) => estMarqueurCitation(l))) {
        const contenu = lignes.map((l) => retirerMarqueurCitation(l)).join(' ')
        return { type: 'texte', texte: contenu, titre: false, niveau: null, citation: true }
      }

      // Titre Markdown explicite : # = niveau 1 (Partie), ## = niveau 2 (Chapitre), le
      // reste = niveau 3 (sous-titre).
      const mMarkdown = uneLigne && lignes[0].match(/^(#{1,6})\s+(.*)$/)
      if (mMarkdown) {
        const contenu = mMarkdown[2].trim()
        const niveau = mMarkdown[1].length === 1 ? 1 : mMarkdown[1].length === 2 ? 2 : 3
        return { type: 'texte', texte: contenu, titre: true, niveau }
      }

      if (uneLigne) {
        const t = lignes[0]
        const toutMajuscules = t === t.toUpperCase() && /[A-ZÀ-Ü]/.test(t) && t.length <= 70
        const reconnuCommeRepere = t.length <= 70 && niveauTitre(t) === 2
        if ((toutMajuscules || reconnuCommeRepere) && t.length <= 80) {
          return { type: 'texte', texte: t, titre: true, niveau: niveauTitre(t) }
        }
      }

      const texteJoint = lignes.join(' ').replace(/\s+/g, ' ').trim()
      // Citation autonome détectée par guillemets + attribution (dernier recours, texte sans
      // balisage Markdown explicite).
      if (ressembleACitationAutonome(texteJoint)) {
        return { type: 'texte', texte: texteJoint, titre: false, niveau: null, citation: true }
      }
      return { type: 'texte', texte: texteJoint, titre: false, niveau: null }
    })
    .filter((p) => p.texte.length > 0)

  const tableMatieres = paragraphes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphes), tableMatieres }
}
