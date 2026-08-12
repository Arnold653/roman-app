import { createClient } from '@/lib/supabase/server'

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
      .select('id, contenu, created_at, user_id, profiles(pseudo, avatar_url), chapitres(numero, romans(titre, slug))')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('likes')
      .select('created_at, user_id, profiles(pseudo, avatar_url), chapitres(numero, romans(titre, slug))')
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
      roman: p.romans?.titre,
      slug: p.romans?.slug,
      numero: p.numero,
      titreChapitre: p.titre,
    })),
    ...(commentaires ?? []).map((c) => ({
      type: 'commentaire',
      date: c.created_at,
      user_id: c.user_id,
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
      profil: l.profiles,
      roman: l.chapitres?.romans?.titre,
      slug: l.chapitres?.romans?.slug,
      numero: l.chapitres?.numero,
    })),
  ]
    .map((item) => ({ ...item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-3">Ton fil</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        Priorité aux lecteurs que tu suis, puis à l'activité récente.
      </p>

      <ul className="divide-y divide-ligne">
        {activite.map((a, i) =>
          a.type === 'premiere' ? (
            <li key={i} className="py-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-or/15 border border-or/40 flex items-center justify-center shrink-0">
                <span className="text-or text-sm">✨</span>
              </div>
              <div className="min-w-0 text-sm">
                <span className="text-or font-mono text-[0.65rem] uppercase tracking-widest">C'est sorti</span>
                <p className="text-papier/70 mt-1">
                  <a href={`/roman/${a.slug}?ch=${a.numero}`} className="text-papier hover:text-or transition-colors">
                    « {a.roman} »
                  </a>{' '}
                  — chapitre {a.numero}{a.titreChapitre ? ` · ${a.titreChapitre}` : ''} vient de paraître.
                </p>
              </div>
            </li>
          ) : (
          <li key={i} className="py-4 flex gap-3">
            {a.profil?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.profil.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
                <span className="font-display text-sm text-papier">{a.profil?.pseudo?.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0 text-sm">
              <a href={`/profil/${a.profil?.pseudo ?? ''}`} className="text-papier font-mono text-xs uppercase tracking-wide hover:text-or transition-colors">
                {a.profil?.pseudo ?? 'Lecteur'}
              </a>
              {idsSuivis.has(a.user_id) && <span className="text-or text-[0.65rem] font-mono ml-2">· suivi</span>}
              <span className="text-papier/35"> {a.type === 'like' ? 'a aimé' : 'a réagi à'} </span>
              <a href={`/roman/${a.slug}?ch=${a.numero}`} className="text-papier/60 hover:text-or transition-colors">
                « {a.roman} », ch. {a.numero}
              </a>
              {a.type === 'commentaire' && a.contenu && <p className="text-papier/70 mt-1 leading-relaxed">{a.contenu}</p>}
            </div>
          </li>
          )
        )}
        {activite.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-6">Rien pour l'instant.</p>
        )}
      </ul>
    </div>
  )
}
