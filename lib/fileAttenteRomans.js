// File d'attente automatique des romans : au plus LIMITE romans "en_cours" (en train de sortir
// leurs chapitres) à la fois. Un roman qui dépasse la limite est mis "a_venir" (en file, invisible
// côté lecteurs) au lieu d'être publié tout de suite. Dès qu'un roman "en_cours" passe "termine"
// (ou est dépublié/supprimé), la place se libère et le prochain roman en file (le plus ancien,
// ordre d'ajout) est automatiquement promu "en_cours" + rendu visible — ses chapitres suivent la
// programmation qui leur a déjà été donnée, indépendamment de ce mécanisme.
// Réutilise la colonne `statut` de la table romans (en_cours/termine/a_venir), présente depuis le
// schéma d'origine mais jusqu'ici inutilisée par l'app.

export const LIMITE_ROMANS_EN_COURS = 5

// Détermine si un roman qu'on souhaite publier doit sortir tout de suite ou aller en file.
// `forcer: true` (contournement manuel, toujours disponible) publie immédiatement quel que soit
// le nombre de romans déjà en cours.
export async function decidePublicationOuFile(admin, forcer) {
  if (forcer) return { statut: 'en_cours', statut_visibilite: 'publie', enFile: false }

  const { count } = await admin
    .from('romans')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'en_cours')

  if ((count || 0) < LIMITE_ROMANS_EN_COURS) {
    return { statut: 'en_cours', statut_visibilite: 'publie', enFile: false }
  }
  return { statut: 'a_venir', statut_visibilite: 'brouillon', enFile: true }
}

// À appeler chaque fois qu'une place se libère (roman marqué terminé, dépublié ou supprimé) :
// promeut, dans l'ordre d'ajout (le plus ancien d'abord), autant de romans en file que de places
// disponibles.
export async function promouvoirFileAttente(admin) {
  const { count } = await admin
    .from('romans')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'en_cours')

  let placesLibres = LIMITE_ROMANS_EN_COURS - (count || 0)
  const promus = []

  while (placesLibres > 0) {
    const { data: suivant } = await admin
      .from('romans')
      .select('id, titre, slug')
      .eq('statut', 'a_venir')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!suivant) break

    await admin.from('romans').update({ statut: 'en_cours', statut_visibilite: 'publie' }).eq('id', suivant.id)
    promus.push(suivant)
    placesLibres--
  }

  return promus
}
