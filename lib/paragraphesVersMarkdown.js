// Permet d'importer un roman complet depuis un PDF, un EPUB ou un DOCX en réutilisant
// parserMarkdownRoman (lib/parseMd.js) telle quelle : on reconvertit les paragraphes déjà
// structurés (titre + niveau, cf. extractionDocx.js / extractionEpub.js / extractionPdf.js)
// en pseudo-markdown, puis on repasse par le même parseur que pour un import .md.
//
// Règles :
// - Le tout premier titre rencontré est traité comme le titre du roman ("# Titre") — quel
//   que soit son niveau détecté, puisqu'un titre d'ouvrage ne ressemble en général à aucun
//   repère de chapitre reconnu.
// - Tout titre reconnu comme repère de chapitre/partie (niveau <= 2, cf. niveauTitre) devient
//   une frontière de chapitre ("## Titre").
// - Un sous-titre (niveau 3 à 6) devient un titre Markdown de même profondeur ("###" à
//   "######") à l'intérieur du chapitre — CorpsChapitre.js sait les afficher distinctement.
// - Un paragraphe détecté comme citation à l'extraction (cf. extractionCommune.js) est rendu
//   en blockquote Markdown ("> texte") — CorpsChapitre.js sait l'afficher distinctement.
// Les images et tableaux (issus d'un PDF) sont ignorés : un roman n'en contient pas.
export function paragraphesVersMarkdown(paragraphes) {
  let titreRomanTrouve = false
  return paragraphes
    .filter((p) => p.type === 'texte')
    .map((p) => {
      if (p.titre && !titreRomanTrouve) {
        titreRomanTrouve = true
        return `# ${p.texte}`
      }
      if (p.titre && p.niveau <= 2) {
        return `## ${p.texte}`
      }
      if (p.titre) {
        return `${'#'.repeat(p.niveau)} ${p.texte}`
      }
      if (p.citation) {
        return `> ${p.texte}`
      }
      return p.texte
    })
    .join('\n\n')
}
