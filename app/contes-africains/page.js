import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CatalogueContesAfricains from '@/components/CatalogueContesAfricains'

export default async function ContesAfricainsPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contes } = await supabase
    .from('contes_africains')
    .select('id, titre, slug, auteur, region, genre, description, genere_par_ia, verifie_par, created_at, contenu_extrait, couverture_url')
    .eq('statut', 'publie')
    .order('created_at', { ascending: false })

  const ids = (contes || []).map((c) => c.id)

  const [{ data: toutesProgressions }, { data: progressionUtilisateur }] = await Promise.all([
    ids.length > 0
      ? admin.from('lecture_progress_contes_africains').select('conte_id, user_id').in('conte_id', ids)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('lecture_progress_contes_africains').select('conte_id, derniere_section').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const lecteursParConte = {}
  for (const p of toutesProgressions || []) {
    if (!lecteursParConte[p.conte_id]) lecteursParConte[p.conte_id] = new Set()
    lecteursParConte[p.conte_id].add(p.user_id)
  }
  const progressionParConte = Object.fromEntries((progressionUtilisateur || []).map((p) => [p.conte_id, p.derniere_section]))

  const septJours = Date.now() - 7 * 86400000
  const enrichis = (contes || []).map((c) => {
    const nbSections = c.contenu_extrait?.sections?.length || 0
    const sectionActuelle = progressionParConte[c.id]
    return {
      id: c.id, titre: c.titre, slug: c.slug, auteur: c.auteur, region: c.region, genre: c.genre, description: c.description,
      genere_par_ia: c.genere_par_ia, verifie_par: c.verifie_par, couverture_url: c.couverture_url,
      nbSections,
      nbLecteurs: lecteursParConte[c.id]?.size || 0,
      nouveau: new Date(c.created_at).getTime() > septJours,
      created_at: c.created_at,
      sectionEnCours: sectionActuelle != null ? sectionActuelle + 1 : null,
    }
  })

  return <CatalogueContesAfricains contes={enrichis} />
}
