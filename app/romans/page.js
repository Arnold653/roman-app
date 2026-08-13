import { createClient } from '@/lib/supabase/server'
import CatalogueRomans from '@/components/CatalogueRomans'

export default async function RomansPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: romans }, { data: chapitres }, { data: likes }, { data: commentaires }] = await Promise.all([
    supabase
      .from('romans')
      .select('id, titre, slug, resume, genre, couverture_url, genere_par_ia, verifie_par, created_at')
      .eq('statut_visibilite', 'publie'),
    supabase
      .from('chapitres')
      .select('id, roman_id, numero, publie_le')
      .lte('publie_le', new Date().toISOString()),
    supabase.from('likes').select('chapitre_id, chapitres!inner(roman_id)'),
    supabase.from('commentaires').select('chapitre_id, chapitres!inner(roman_id)'),
  ])

  let progressionParRoman = {}
  if (user) {
    const { data: progression } = await supabase
      .from('lecture_progress')
      .select('roman_id, dernier_chapitre')
      .eq('user_id', user.id)
    progressionParRoman = Object.fromEntries((progression || []).map((p) => [p.roman_id, p.dernier_chapitre]))
  }

  // Agrégations côté serveur — évite de recalculer à chaque re-render côté client.
  const nbChapitresParRoman = {}
  const dernierePubliParRoman = {}
  for (const c of chapitres || []) {
    nbChapitresParRoman[c.roman_id] = (nbChapitresParRoman[c.roman_id] || 0) + 1
    if (!dernierePubliParRoman[c.roman_id] || c.publie_le > dernierePubliParRoman[c.roman_id]) {
      dernierePubliParRoman[c.roman_id] = c.publie_le
    }
  }
  const likesParRoman = {}
  for (const l of likes || []) {
    const rid = l.chapitres?.roman_id
    if (rid) likesParRoman[rid] = (likesParRoman[rid] || 0) + 1
  }
  const commentairesParRoman = {}
  for (const c of commentaires || []) {
    const rid = c.chapitres?.roman_id
    if (rid) commentairesParRoman[rid] = (commentairesParRoman[rid] || 0) + 1
  }

  const septJours = Date.now() - 7 * 86400000
  const enrichis = (romans || []).map((r) => ({
    ...r,
    nbChapitres: nbChapitresParRoman[r.id] || 0,
    nbLikes: likesParRoman[r.id] || 0,
    nbCommentaires: commentairesParRoman[r.id] || 0,
    nouveau: dernierePubliParRoman[r.id] ? new Date(dernierePubliParRoman[r.id]).getTime() > septJours : false,
    dernierePublication: dernierePubliParRoman[r.id] || r.created_at,
    chapitreEnCours: progressionParRoman[r.id] || null,
  }))

  return <CatalogueRomans romans={enrichis} />
}
