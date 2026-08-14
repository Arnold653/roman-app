import { createClient } from '@/lib/supabase/server'
import FilActivite from '@/components/FilActivite'

export default async function FilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">
        <a href="/login" className="text-or hover:brightness-125">Connecte-toi</a> pour voir ton fil.
      </div>
    )
  }

  const { data: suivis } = await supabase.from('follows').select('suivi_id').eq('follower_id', user.id)
  const idsSuivis = new Set((suivis ?? []).map((s) => s.suivi_id))

  const depuis48h = new Date(Date.now() - 48 * 3_600_000).toISOString()

  const [{ data: commentaires }, { data: likes }, { data: premieres }] = await Promise.all([
    supabase
      .from('commentaires')
      .select('id, contenu, created_at, user_id, profiles(pseudo, avatar_url), chapitres(id, numero, romans(titre, slug))')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('likes')
      .select('created_at, user_id, profiles(pseudo, avatar_url), chapitres(id, numero, romans(titre, slug))')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('chapitres')
      .select('id, numero, titre, publie_le, romans!inner(titre, slug, statut_visibilite)')
      .eq('notifie', true)
      .eq('romans.statut_visibilite', 'publie')
      .gte('publie_le', depuis48h)
      .order('publie_le', { ascending: false })
      .limit(10),
  ])

  const maintenant = Date.now()

  function score(item) {
    const heures = (maintenant - new Date(item.date).getTime()) / 3_600_000
    const decroissance = Math.max(0, 48 - heures) // s'éteint après 48h
    const bonusSuivi = idsSuivis.has(item.user_id) ? 25 : 0
    const bonusType = item.type === 'commentaire' ? 5 : item.type === 'premiere' ? 20 : 0
    return decroissance + bonusSuivi + bonusType
  }

  const activite = [
    ...(premieres ?? []).map((p) => ({
      type: 'premiere',
      date: p.publie_le,
      user_id: null,
      chapitreId: p.id,
      roman: p.romans?.titre,
      slug: p.romans?.slug,
      numero: p.numero,
      titreChapitre: p.titre,
    })),
    ...(commentaires ?? []).map((c) => ({
      type: 'commentaire',
      date: c.created_at,
      user_id: c.user_id,
      chapitreId: c.chapitres?.id ?? null,
      profil: c.profiles,
      roman: c.chapitres?.romans?.titre,
      slug: c.chapitres?.romans?.slug,
      numero: c.chapitres?.numero,
      contenu: c.contenu,
    })),
    ...(likes ?? []).map((l) => ({
      type: 'like',
      date: l.created_at,
      user_id: l.user_id,
      chapitreId: l.chapitres?.id ?? null,
      profil: l.profiles,
      roman: l.chapitres?.romans?.titre,
      slug: l.chapitres?.romans?.slug,
      numero: l.chapitres?.numero,
    })),
  ]
    .map((item) => ({ ...item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((item, i) => ({ ...item, id: i }))

  const chapitreIdsPresents = [...new Set(activite.map((a) => a.chapitreId).filter(Boolean))]

  let mesLikesInitiaux = []
  if (chapitreIdsPresents.length > 0) {
    const { data: mesLikes } = await supabase
      .from('likes')
      .select('chapitre_id')
      .eq('user_id', user.id)
      .in('chapitre_id', chapitreIdsPresents)
    mesLikesInitiaux = (mesLikes ?? []).map((l) => l.chapitre_id)
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-3">Ton fil</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        Priorité aux lecteurs que tu suis, puis à l'activité récente.
      </p>

      <FilActivite
        activite={activite}
        idsSuivis={[...idsSuivis]}
        mesLikesInitiaux={mesLikesInitiaux}
        userId={user.id}
      />
    </div>
  )
}
