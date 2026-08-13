import { createClient } from '@/lib/supabase/server'
import { tempsRelatif } from '@/lib/temps'

function initiale(pseudo) {
  return (pseudo || '?').trim().charAt(0).toUpperCase()
}

function Avatar({ pseudo, avatar_url }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
      <span className="font-display text-sm text-papier">{initiale(pseudo)}</span>
    </div>
  )
}

export default async function CommunautePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const depuis7j = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()

  const [{ data: commentairesSemaine }, { data: likesSemaine }] = await Promise.all([
    supabase
      .from('commentaires')
      .select('id, contenu, created_at, user_id, profiles(pseudo, avatar_url), chapitres(id, numero, romans(id, titre, slug))')
      .gte('created_at', depuis7j)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('likes')
      .select('created_at, user_id, profiles(pseudo, avatar_url), chapitres(id, numero, romans(id, titre, slug))')
      .gte('created_at', depuis7j)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const commentaires = commentairesSemaine ?? []
  const likes = likesSemaine ?? []

  // Repli si la semaine est calme : on va chercher les derniers commentaires réels, sans filtre de date
  let derniersCommentaires = commentaires.slice(0, 8)
  if (derniersCommentaires.length === 0) {
    const { data: ancienCommentaires } = await supabase
      .from('commentaires')
      .select('id, contenu, created_at, user_id, profiles(pseudo, avatar_url), chapitres(id, numero, romans(id, titre, slug))')
      .order('created_at', { ascending: false })
      .limit(6)
    derniersCommentaires = ancienCommentaires ?? []
  }

  // Stats réelles de la semaine
  const lecteursActifsSet = new Set([
    ...commentaires.map((c) => c.user_id).filter(Boolean),
    ...likes.map((l) => l.user_id).filter(Boolean),
  ])
  const statsSemaine = {
    commentaires: commentaires.length,
    likes: likes.length,
    lecteurs: lecteursActifsSet.size,
  }

  // Romans qui font le plus parler cette semaine
  const romansMap = new Map()
  function comptabiliserRoman(roman) {
    if (!roman?.id) return
    const entree = romansMap.get(roman.id) ?? { titre: roman.titre, slug: roman.slug, total: 0 }
    entree.total += 1
    romansMap.set(roman.id, entree)
  }
  commentaires.forEach((c) => comptabiliserRoman(c.chapitres?.romans))
  likes.forEach((l) => comptabiliserRoman(l.chapitres?.romans))
  const romansActifs = [...romansMap.values()].sort((a, b) => b.total - a.total).slice(0, 5)

  // Lecteurs qui font vivre la communauté (commentaire = plus de poids que like)
  const lecteursMap = new Map()
  function comptabiliserLecteur(userId, profil, poids) {
    if (!userId) return
    const entree = lecteursMap.get(userId) ?? {
      pseudo: profil?.pseudo,
      avatar_url: profil?.avatar_url,
      commentaires: 0,
      likes: 0,
    }
    if (poids === 2) entree.commentaires += 1
    else entree.likes += 1
    lecteursMap.set(userId, entree)
  }
  commentaires.forEach((c) => comptabiliserLecteur(c.user_id, c.profiles, 2))
  likes.forEach((l) => comptabiliserLecteur(l.user_id, l.profiles, 1))
  const topLecteurs = [...lecteursMap.values()]
    .map((l) => ({ ...l, score: l.commentaires * 2 + l.likes }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-3">Communauté</h1>
      <p className="text-papier/50 mb-10 leading-relaxed">
        Ce que les lecteurs d'Encre lisent, aiment et commentent en ce moment.
      </p>

      {/* Bandeau stats réelles de la semaine */}
      <div className="grid grid-cols-3 gap-3 mb-14">
        <div className="border border-ligne rounded-2xl px-3 py-4 text-center">
          <p className="font-display text-2xl text-papier">{statsSemaine.commentaires}</p>
          <p className="text-papier/40 font-mono text-[0.65rem] uppercase tracking-widest mt-1">Commentaires</p>
        </div>
        <div className="border border-ligne rounded-2xl px-3 py-4 text-center">
          <p className="font-display text-2xl text-papier">{statsSemaine.likes}</p>
          <p className="text-papier/40 font-mono text-[0.65rem] uppercase tracking-widest mt-1">Likes</p>
        </div>
        <div className="border border-ligne rounded-2xl px-3 py-4 text-center">
          <p className="font-display text-2xl text-papier">{statsSemaine.lecteurs}</p>
          <p className="text-papier/40 font-mono text-[0.65rem] uppercase tracking-widest mt-1">Lecteurs actifs</p>
        </div>
      </div>
      <p className="text-papier/25 font-mono text-[0.65rem] uppercase tracking-widest -mt-11 mb-14">Cette semaine</p>

      {/* Romans qui font le plus parler */}
      {romansActifs.length > 0 && (
        <>
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Ça discute en ce moment</p>
          <ul className="divide-y divide-ligne mb-14">
            {romansActifs.map((r) => (
              <li key={r.slug} className="py-4 flex items-center justify-between gap-3">
                <a href={`/roman/${r.slug}`} className="text-papier font-display text-lg hover:text-or transition-colors truncate">
                  « {r.titre} »
                </a>
                <span className="shrink-0 text-or font-mono text-xs border border-or/30 rounded-full px-3 py-1">
                  {r.total} {r.total > 1 ? 'réactions' : 'réaction'}
                </span>
              </li>
            ))}
          </ul>
          <div className="filet-or mb-14" />
        </>
      )}

      {/* Lecteurs les plus actifs */}
      {topLecteurs.length > 0 && (
        <>
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Lecteurs qui font vivre Encre</p>
          <ul className="divide-y divide-ligne mb-14">
            {topLecteurs.map((l, i) => (
              <li key={l.pseudo ?? i} className="py-4 flex items-center gap-3">
                <span className="text-papier/25 font-mono text-xs w-4 shrink-0">{i + 1}</span>
                <Avatar pseudo={l.pseudo} avatar_url={l.avatar_url} />
                <div className="min-w-0 flex-1">
                  <a
                    href={`/profil/${l.pseudo ?? ''}`}
                    className="text-papier font-mono text-xs uppercase tracking-wide hover:text-or transition-colors"
                  >
                    {l.pseudo ?? 'Lecteur'}
                  </a>
                  <p className="text-papier/35 text-xs mt-0.5">
                    {l.commentaires} commentaire{l.commentaires !== 1 ? 's' : ''} · {l.likes} like{l.likes !== 1 ? 's' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="filet-or mb-14" />
        </>
      )}

      {/* Derniers mots des lecteurs */}
      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Derniers mots des lecteurs</p>
      <ul className="divide-y divide-ligne mb-14">
        {derniersCommentaires.map((c) => (
          <li key={c.id} className="py-4 flex gap-3">
            <Avatar pseudo={c.profiles?.pseudo} avatar_url={c.profiles?.avatar_url} />
            <div className="min-w-0 text-sm flex-1">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={`/profil/${c.profiles?.pseudo ?? ''}`}
                  className="text-papier font-mono text-xs uppercase tracking-wide hover:text-or transition-colors"
                >
                  {c.profiles?.pseudo ?? 'Lecteur'}
                </a>
                <span className="text-papier/25 font-mono text-[0.65rem] shrink-0">{tempsRelatif(c.created_at)}</span>
              </div>
              <p className="mt-0.5">
                <span className="text-papier/35">à propos de </span>
                <a href={`/roman/${c.chapitres?.romans?.slug}?ch=${c.chapitres?.numero}`} className="text-papier/60 hover:text-or transition-colors">
                  « {c.chapitres?.romans?.titre} », ch. {c.chapitres?.numero}
                </a>
              </p>
              {c.contenu && <p className="text-papier/70 mt-1 leading-relaxed">{c.contenu}</p>}
            </div>
          </li>
        ))}
        {derniersCommentaires.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-6">Rien pour l'instant — sois le premier à réagir à un chapitre.</p>
        )}
      </ul>

      <div className="filet-or mb-8" />

      <div className="text-center py-6">
        <p className="text-papier/50 mb-4 leading-relaxed">
          {user ? 'Une lecture t\'a marqué cette semaine ? Dis-le en commentaire.' : 'Rejoins la conversation autour de tes lectures.'}
        </p>
        <div className="flex justify-center gap-6">
          <a href="/romans" className="text-or text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-colors">
            Trouver une lecture →
          </a>
          <a href="/lecteurs" className="text-or text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-colors">
            Découvrir des lecteurs →
          </a>
        </div>
      </div>
    </div>
  )
}
