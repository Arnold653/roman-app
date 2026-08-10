// Parse un fichier .md décrivant un roman entier ou un seul chapitre.
//
// Format attendu pour un roman complet :
//   # Titre du roman
//   Résumé du roman sur une ou plusieurs lignes.
//   Genre: Thriller / Enquête
//
//   ## Chapitre 1 : Titre du chapitre
//   Texte du chapitre...
//
//   > Citation de fin optionnelle.
//
//   ## Chapitre 2 : Autre titre
//   Texte...
//
// Tolère aussi "## Chapitre 1 — Titre" (tiret) et l'absence de titre après le numéro.
// Les lignes de séparation de scène isolées (---, ***, ___) sont retirées automatiquement.
// Si aucun "## Chapitre" n'est trouvé, tout le fichier est traité comme le texte d'un seul chapitre.
export function parserMarkdownRoman(texte) {
  const brut = texte.replace(/\r\n/g, '\n').trim()

  const regexChapitre = /^##\s+Chapitre\s+(\d+)\s*[:\-–—]?\s*(.*)$/gim
  const decoupages = [...brut.matchAll(regexChapitre)]

  function nettoyerContenu(contenu) {
    return contenu
      .split('\n')
      .filter((l) => !/^\s*(---+|\*\*\*+|___+)\s*$/.test(l))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function nettoyerTitre(titre) {
    return (titre || '').replace(/^[\s:\-–—]+/, '').trim()
  }

  if (decoupages.length === 0) {
    return { titre: '', resume: '', genre: '', chapitres: [{ numero: 1, titre: '', contenu: nettoyerContenu(brut), citation_fin: '' }] }
  }

  const entete = brut.slice(0, decoupages[0].index).trim()
  let titre = ''
  let genre = ''
  const lignesResume = []

  for (const ligne of entete.split('\n')) {
    const l = ligne.trim()
    if (!l) continue
    if (l.startsWith('# ')) titre = l.slice(2).trim()
    else if (/^genre\s*:/i.test(l)) genre = l.replace(/^genre\s*:/i, '').trim()
    else if (!/^\s*(---+|\*\*\*+|___+)\s*$/.test(l)) lignesResume.push(l)
  }

  const chapitres = decoupages.map((match, i) => {
    const debut = match.index + match[0].length
    const fin = i + 1 < decoupages.length ? decoupages[i + 1].index : brut.length
    let contenu = brut.slice(debut, fin).trim()

    let citation_fin = ''
    const lignesCitation = []
    const lignesContenu = contenu.split('\n')
    while (lignesContenu.length > 0 && (lignesContenu[lignesContenu.length - 1].trim().startsWith('>') || lignesContenu[lignesContenu.length - 1].trim() === '')) {
      const derniere = lignesContenu.pop()
      if (derniere.trim().startsWith('>')) lignesCitation.unshift(derniere.trim().replace(/^>\s?/, ''))
    }
    if (lignesCitation.length > 0) {
      citation_fin = lignesCitation.join(' ')
      contenu = lignesContenu.join('\n').trim()
    }

    return {
      numero: Number(match[1]),
      titre: nettoyerTitre(match[2]),
      contenu: nettoyerContenu(contenu),
      citation_fin,
    }
  })

  return { titre, resume: lignesResume.join(' '), genre, chapitres }
}
