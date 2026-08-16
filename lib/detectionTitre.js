// Détection automatique de titre + génération de slug pour l'upload multiple de fichiers,
// partagée entre Romans, Livres, Contes Africains et Contes Enfants (côté admin uniquement).

// Nettoie un nom de fichier en titre lisible : retire l'extension, remplace tirets/underscores
// par des espaces, met en forme façon "Titre Casse". Sert de repli quand le contenu du fichier
// ne donne rien d'exploitable.
export function titreDepuisNomFichier(nomFichier) {
  const sansExt = (nomFichier || '').replace(/\.[^.]+$/, '')
  const espace = sansExt.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!espace) return 'Sans titre'
  return espace
    .split(' ')
    .map((mot) => (mot.length > 0 ? mot[0].toUpperCase() + mot.slice(1) : mot))
    .join(' ')
}

// Tente de détecter un titre depuis la toute première ligne/bloc du contenu extrait (le genre
// de repère qu'on trouve en tête d'un PDF/EPUB/DOCX/TXT bien formé) : courte, pas un repère de
// chapitre/partie (sinon ce n'est pas un titre d'ouvrage mais un titre de section interne).
export function titreDepuisPremierBloc(texte) {
  const t = (texte || '').trim()
  if (!t || t.length > 100) return null
  if (/^(chapitre|partie|section|page|d[ée]dicace|avant[- ]propos|introduction|pr[ée]face|prologue|conte)\b/i.test(t)) return null
  return t
}

// Détecte le titre le plus probable pour un fichier de livre/conte (contenu extrait au format
// `{ sections: [...] }`, cf. extractionTexte/Pdf/Epub/Docx.js) : contenu d'abord, sinon nom de
// fichier nettoyé.
export function detecterTitreLivre(nomFichier, contenu) {
  const premierBloc = contenu?.sections?.[0]?.blocs?.[0]
  if (premierBloc?.titre) {
    const t = titreDepuisPremierBloc(premierBloc.texte)
    if (t) return t
  }
  return titreDepuisNomFichier(nomFichier)
}

// Génère un slug depuis un titre : minuscules, sans accents, tirets.
export function slugDepuisTitre(titre) {
  return (titre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Rend un slug unique face à une liste de slugs déjà pris (existants en base + déjà utilisés
// dans le lot en cours) en ajoutant -2, -3... si besoin.
export function slugUnique(slugBase, slugsExistants) {
  let slug = slugBase || 'sans-titre'
  let n = 2
  while (slugsExistants.has(slug)) {
    slug = `${slugBase}-${n}`
    n++
  }
  return slug
}
