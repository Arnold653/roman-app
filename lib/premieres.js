import { envoyerPush } from '@/lib/push'

// Repère les chapitres dont l'heure de sortie programmée ("Première") vient de passer
// et qui n'ont pas encore déclenché leur notification, puis les publie et notifie les lecteurs
// déjà engagés sur le roman (in-app + push).
//
// Idempotent : peut être appelée aussi souvent qu'on veut (cron, ping externe, ou déclenchement
// côté client quand un compte à rebours arrive à zéro) — un chapitre déjà notifié est ignoré.
export async function publierChapitresDus(admin) {
  const { data: chapitresAPublier } = await admin
    .from('chapitres')
    .select('id, numero, roman_id, romans(titre, slug)')
    .eq('notifie', false)
    .lte('publie_le', new Date().toISOString())

  if (!chapitresAPublier || chapitresAPublier.length === 0) {
    return { traites: 0, chapitres: [] }
  }

  for (const chapitre of chapitresAPublier) {
    // Marquer notifié EN PREMIER pour éviter une double notification si deux appels
    // se chevauchent (client + cron par exemple).
    const { data: verrou } = await admin
      .from('chapitres')
      .update({ notifie: true })
      .eq('id', chapitre.id)
      .eq('notifie', false)
      .select('id')

    if (!verrou || verrou.length === 0) continue // un autre appel a déjà traité ce chapitre

    const { data: lecteurs } = await admin
      .from('lecture_progress')
      .select('user_id')
      .eq('roman_id', chapitre.roman_id)

    if (lecteurs && lecteurs.length > 0) {
      const notifs = lecteurs.map((l) => ({
        user_id: l.user_id,
        type: 'nouveau_chapitre',
        contenu: `« ${chapitre.romans?.titre} » — le chapitre ${chapitre.numero} vient de sortir.`,
        lien: `/roman/${chapitre.romans?.slug}?ch=${chapitre.numero}`,
      }))
      await admin.from('notifications').insert(notifs)
      await Promise.all(
        lecteurs.map((l) =>
          envoyerPush(
            l.user_id,
            chapitre.romans?.titre,
            `Le chapitre ${chapitre.numero} vient de sortir.`,
            `/roman/${chapitre.romans?.slug}?ch=${chapitre.numero}`
          )
        )
      )
    }
  }

  return { traites: chapitresAPublier.length, chapitres: chapitresAPublier }
}
