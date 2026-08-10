import { createClient } from '@/lib/supabase/server'
import BoutonSuivre from '@/components/BoutonSuivre'

function AvatarMonogramme({ pseudo }) {
  const initiale = (pseudo || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
      <span className="font-display text-2xl text-papier">{initiale}</span>
    </div>
  )
}

export default async function ProfilPage({ params }) {
  const supabase = createClient()

  const { data: profil } = await supabase
    .from('profiles')
    .select('*')
    .ilike('pseudo', params.pseudo.trim())
    .maybeSingle()

  if (!profil) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Lecteur introuvable.</div>
  }

  const [{ count: abonnes }, { count: abonnements }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('suivi_id', profil.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profil.id),
  ])

  const { data: commentaires } = await supabase
    .from('commentaires')
    .select('id, contenu, created_at, chapitres(numero, titre, romans(titre, slug))')
    .eq('user_id', profil.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: progression } = await supabase
    .from('lecture_progress')
    .select('dernier_chapitre, romans(titre, slug)')
    .eq('user_id', profil.id)

  const { data: { user } } = await supabase.auth.getUser()
  const estMonProfil = user?.id === profil.id

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          {profil.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profil.avatar_url} alt={profil.pseudo} className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <AvatarMonogramme pseudo={profil.pseudo} />
          )}
          <div>
            <h1 className="font-display text-3xl text-papier">{profil.pseudo}</h1>
            <p className="text-papier/35 text-xs font-mono mt-1">
              Lecteur·rice depuis {new Date(profil.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        {estMonProfil ? (
          <a href="/profil/modifier" className="text-sm border border-ligne rounded-full px-5 py-2 text-papier/60 hover:border-or hover:text-or transition-colors">
            Modifier
          </a>
        ) : (
          <div className="flex gap-2 shrink-0">
            <a href={`/messages/${profil.pseudo}`} className="text-sm border border-ligne rounded-full px-4 py-2 text-papier/60 hover:border-or hover:text-or transition-colors">
              Message
            </a>
            <BoutonSuivre profilId={profil.id} />
          </div>
        )}
      </div>

      {profil.bio && <p className="text-papier/65 text-sm leading-relaxed mt-4 max-w-md">{profil.bio}</p>}

      <div className="flex gap-6 mt-6 font-mono text-sm">
        <span className="text-papier/60"><b className="text-papier">{abonnes ?? 0}</b> abonnés</span>
        <span className="text-papier/60"><b className="text-papier">{abonnements ?? 0}</b> abonnements</span>
      </div>

      {progression && progression.length > 0 && (
        <>
          <p className="text-or text-xs font-mono uppercase tracking-widest mt-12 mb-4">En lecture</p>
          <div className="flex flex-wrap gap-2">
            {progression.map((p, i) => (
              <a
                key={i}
                href={`/roman/${p.romans?.slug}`}
                className="text-sm border border-ligne rounded-full px-4 py-1.5 text-papier/60 hover:border-or hover:text-or transition-colors"
              >
                {p.romans?.titre} — ch. {p.dernier_chapitre}
              </a>
            ))}
          </div>
        </>
      )}

      <p className="text-or text-xs font-mono uppercase tracking-widest mt-12 mb-4">Dernières réactions</p>
      <ul className="divide-y divide-ligne">
        {(commentaires ?? []).map((c) => (
          <li key={c.id} className="py-4">
            <a
              href={`/roman/${c.chapitres?.romans?.slug}?ch=${c.chapitres?.numero}`}
              className="text-xs text-papier/35 font-mono hover:text-or transition-colors"
            >
              {c.chapitres?.romans?.titre} — chapitre {c.chapitres?.numero}
            </a>
            <p className="text-papier/75 mt-1.5 leading-relaxed text-sm">{c.contenu}</p>
          </li>
        ))}
        {(!commentaires || commentaires.length === 0) && (
          <p className="text-papier/30 text-sm font-mono py-4">Pas encore de réaction publiée.</p>
        )}
      </ul>
    </div>
  )
}
