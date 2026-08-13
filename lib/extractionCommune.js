// Utilitaires partagés entre le parseur de romans (.md) et l'extraction des livres (PDF/.md/.txt) :
// reconnaissance des repères de chapitre/partie sous des formes variées, et découpage en
// "sections" de lecture. Centralisé ici pour que romans et livres bénéficient des mêmes
// améliorations de reconnaissance sans dupliquer la logique.

const VALEURS_ROMAINES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

// Convertit un chiffre romain (I, II, IV, IX...) en nombre. Renvoie null si la chaîne
// n'est pas un chiffre romain valide.
export function romainVersNombre(s) {
  const t = (s || '').toUpperCase().trim()
  if (!t || !/^[IVXLCDM]+$/.test(t)) return null
  let total = 0
  for (let i = 0; i < t.length; i++) {
    const cur = VALEURS_ROMAINES[t[i]]
    const suivant = VALEURS_ROMAINES[t[i + 1]]
    if (suivant && cur < suivant) total -= cur
    else total += cur
  }
  return total > 0 ? total : null
}

// Reconnaît une ligne qui EST un repère de chapitre numéroté, sous des formes variées :
// "Chapitre 4", "CHAPITRE IV", "IV", "4.", "04 —"... Renvoie le numéro trouvé (toujours en
// chiffres arabes), ou null si la ligne ne ressemble à aucun repère de ce type.
export function extraireNumeroChapitre(texte) {
  const t = (texte || '').trim()

  let m = t.match(/^chapitre\s+([ivxlcdm]+|\d{1,4})\b/i)
  if (m) return /^\d+$/.test(m[1]) ? Number(m[1]) : romainVersNombre(m[1])

  // Une ligne qui n'est QUE un numéro/chiffre romain isolé, éventuellement suivi d'un point,
  // deux-points ou tiret — le genre de repère qu'on trouve seul sur sa propre ligne dans un
  // sommaire ou en tête de chapitre, sans le mot "Chapitre" écrit explicitement.
  m = t.match(/^([ivxlcdm]+|\d{1,4})\s*[.\-–—:]?\s*$/i)
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : romainVersNombre(m[1])
    // On exige un nombre arabe, ou un chiffre romain d'au moins 2 caractères (II, IV, IX...),
    // ou une ponctuation de confirmation — pour éviter de prendre un simple "I" ou "V" isolé
    // (souvent une initiale) pour un repère de chapitre.
    if (n !== null && (/^\d+$/.test(m[1]) || m[1].length >= 2 || /[.\-–—:]/.test(t.slice(m[1].length)))) return n
  }
  return null
}

// Niveau hiérarchique d'un titre détecté, de 1 (plus grande division) à 6 (sous-titre le plus
// profond) : 1 = Partie/Section, 2 = Chapitre ou grand bloc éditorial (dédicace, avant-propos,
// introduction, bonus...) qui démarre une nouvelle "page" de lecture, 3 à 6 = sous-titres
// affichés à l'intérieur d'une page, du plus large (3) au plus fin (6).
// `profondeur` est un indice optionnel fourni par le format source quand il en a un (nombre de
// "#" en Markdown, profondeur de balise Hn en DOCX/EPUB). Le contenu (mots-clés "Partie",
// "Chapitre"...) reste toujours prioritaire — la profondeur de balise ne sert de repli que pour
// les sous-titres (3 à 6), qui n'ont pas de vocabulaire particulier à reconnaître ; pour les
// niveaux 1/2, la profondeur de balise seule n'est pas fiable d'un document à l'autre.
export function niveauTitre(texte, profondeur = null) {
  const t = texte.trim()
  if (/^(partie|section)\s*[ivxlcdm\d]*\b/i.test(t)) return 1
  if (/^(chapitre|d[ée]dicace|avant[- ]propos|introduction|pr[ée]face|prologue|[ée]pilogue|conclusion|remerciements|annexe|bonus)\b/i.test(t)) return 2
  if (extraireNumeroChapitre(t) !== null) return 2
  if (profondeur !== null) return Math.min(6, Math.max(3, profondeur))
  return 3
}

// Reconnaît une ligne préfixée par le marqueur Markdown de citation (">"), qu'elle vienne
// d'un fichier .md/.txt tapé à la main ou d'un <blockquote> HTML converti en amont (DOCX/EPUB).
export function estMarqueurCitation(texte) {
  return /^>\s?/.test((texte || '').trim())
}

// Retire le marqueur ">" en tête de ligne pour ne garder que le texte de la citation.
export function retirerMarqueurCitation(texte) {
  return (texte || '').replace(/^>\s?/, '').trim()
}

// Heuristique de dernier recours (PDF, texte brut sans balisage explicite) : reconnaît un
// paragraphe qui EST une citation autonome mise en exergue — entièrement entre guillemets
// (français « » ou anglais " "), suivi d'une attribution introduite par un tiret ("— Nom",
// "– Nom, Titre de l'ouvrage"). Volontairement stricte (attribution obligatoire) pour ne pas
// confondre avec une simple ligne de dialogue.
const REGEX_CITATION_AVEC_ATTRIBUTION = /^[«"“]\s*.{3,300}?\s*[»"”]\s*[\-–—]\s*[A-ZÀ-Ü].{0,80}$/s

export function ressembleACitationAutonome(texte) {
  const t = (texte || '').trim()
  if (!t || t.length > 400) return false
  return REGEX_CITATION_AVEC_ATTRIBUTION.test(t)
}

// Libellé court pour une pastille de navigation, à partir d'un titre détecté.
export function libellePastille(texte) {
  const t = texte.trim()
  const mChap = t.match(/^chapitre\s+([ivxlcdm]+|\d+)/i)
  if (mChap) {
    const n = /^\d+$/.test(mChap[1]) ? Number(mChap[1]) : romainVersNombre(mChap[1])
    if (n !== null) return `Ch. ${n}`
  }
  const mPartie = t.match(/^partie\s+([ivxlcdm]+|\d+)/i)
  if (mPartie) return `Partie ${mPartie[1]}`
  const n = extraireNumeroChapitre(t)
  if (n !== null) return `Ch. ${n}`
  const mots = t.split(/\s+/).slice(0, 2).join(' ')
  return mots.length > 16 ? mots.slice(0, 16) + '…' : mots
}

// Découpe une liste de paragraphes { texte, titre, niveau, type } en "pages de lecture" aux
// frontières des titres de niveau 1 ou 2 (Partie, Chapitre, Dédicace, Avant-propos...).
export function decouperEnSections(paragraphes) {
  const frontieres = paragraphes
    .map((p, i) => ({ titre: p.titre, niveau: p.niveau, i }))
    .filter((p) => p.titre && p.niveau <= 2)
    .map((p) => p.i)

  const bornes = frontieres[0] === 0 ? frontieres : [0, ...frontieres]

  return bornes.map((debut, k) => {
    const fin = k + 1 < bornes.length ? bornes[k + 1] : paragraphes.length
    const blocs = paragraphes.slice(debut, fin)
    const premierEstTitre = blocs[0]?.titre && blocs[0].niveau <= 2
    return {
      debut,
      fin,
      blocs,
      pilLabel: premierEstTitre ? libellePastille(blocs[0].texte) : 'Début',
    }
  })
}
