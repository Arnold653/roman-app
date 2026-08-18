import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CatalogueLivres from '@/components/CatalogueLivres'

export default async function LivresPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: livres } = await supabase
    .from('livres')
    .select('id, titre, slug, auteur, genre, description, genere_par_ia, verifie_par, created_at, contenu_extrait, couverture_url')
    .eq('statut', 'publie')
    .order('created_at', { ascending: false })

  const ids = (livres || []).map((l) => l.id)

  // Agrégat anonymisé (nombre de lecteurs distincts) — nécessite le client admin car la
  // progression de lecture est privée par RLS (chacun ne voit que la sienne).
  const [{ data: toutesProgressions }, { data: progressionUtilisateur }] = await Promise.all([
    ids.length > 0
      ? admin.from('lecture_progress_livres').select('livre_id, user_id').in('livre_id', ids)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('lecture_progress_livres').select('livre_id, derniere_section').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const lecteursParLivre = {}
  for (const p of toutesProgressions || []) {
    if (!lecteursParLivre[p.livre_id]) lecteursParLivre[p.livre_id] = new Set()
    lecteursParLivre[p.livre_id].add(p.user_id)
  }
  const progressionParLivre = Object.fromEntries((progressionUtilisateur || []).map((p) => [p.livre_id, p.derniere_section]))

  const septJours = Date.now() - 7 * 86400000
  const enrichis = (livres || []).map((l) => {
    const nbSections = l.contenu_extrait?.sections?.length || 0
    const sectionActuelle = progressionParLivre[l.id]
    return {
      id: l.id, titre: l.titre, slug: l.slug, auteur: l.auteur, genre: l.genre, description: l.description,
      genere_par_ia: l.genere_par_ia, verifie_par: l.verifie_par, couverture_url: l.couverture_url,
      nbSections,
      nbLecteurs: lecteursParLivre[l.id]?.size || 0,
      nouveau: new Date(l.created_at).getTime() > septJours,
      created_at: l.created_at,
      sectionEnCours: sectionActuelle != null ? sectionActuelle + 1 : null, // affichage 1-indexé
    }
  })

  return <CatalogueLivres livres={enrichis} />
}
