// Parse un bloc d'en-tête optionnel en tête d'un fichier .md/.txt de Livre ou Conte :
//   # Titre de l'ouvrage
//   Genre: Développement Personnel
//   Région: Bénin                    (Contes Africains uniquement)
//   Tranche d'âge: 6-8 ans           (Contes Enfants uniquement)
//   Résumé: Un résumé sur une ou plusieurs lignes.
//
// Permet aux fichiers produits par les prompts ROMAN/NON-FICTION/CONTE AFRICAIN/STORYBOOK
// ENGINE d'être auto-suffisants : titre, genre, région/tranche d'âge et résumé sont détectés
// à l'extraction, sans ressaisie manuelle dans l'admin (même principe que "Genre:" pour les
// romans, cf. parseMd.js, étendu ici aux Livres et aux deux sections Contes).
//
// Toutes les lignes de métadonnées sont facultatives et reconnues dans n'importe quel ordre,
// tant qu'elles se trouvent avant le début du texte réel : dès qu'une ligne non vide ne
// correspond à aucun motif reconnu, l'en-tête s'arrête là et le reste du fichier est renvoyé
// intact (pas de faux positif possible une fois entré dans le corps du texte).
export function extraireEnTeteMetadonnees(texteBrut) {
  const texte = (texteBrut || '').replace(/\r\n/g, '\n').trim()
  const lignes = texte.split('\n')

  let titre = ''
  let genre = ''
  let region = ''
  let trancheAge = ''
  const lignesResume = []
  let i = 0

  if (lignes[0] && /^#\s+.+/.test(lignes[0])) {
    titre = lignes[0].replace(/^#\s+/, '').trim()
    i = 1
  }

  for (; i < lignes.length; i++) {
    const l = lignes[i].trim()
    if (!l) continue
    if (/^genre\s*:/i.test(l)) { genre = l.replace(/^genre\s*:/i, '').trim(); continue }
    if (/^r[ée]gion\s*:/i.test(l)) { region = l.replace(/^r[ée]gion\s*:/i, '').trim(); continue }
    if (/^tranche\s*d.?[âa]ge\s*:/i.test(l)) { trancheAge = l.replace(/^tranche\s*d.?[âa]ge\s*:/i, '').trim(); continue }
    if (/^(r[ée]sum[ée]|description)\s*:/i.test(l)) {
      lignesResume.push(l.replace(/^(r[ée]sum[ée]|description)\s*:/i, '').trim())
      continue
    }
    break
  }

  const resteDuTexte = lignes.slice(i).join('\n').trim()
  return { titre, genre, region, trancheAge, description: lignesResume.join(' '), resteDuTexte }
}
