import { createClient } from '@/lib/supabase/server'

export default async function CommunautePage() {
  const supabase = createClient()

  const { data: discussions } = await supabase
    .from('discussions')
    .select('id, titre, created_at, romans(titre)')
    .order('created_at', { ascending: false })

  const { data: commentaires } = await supabase
    .from('commentaires')
    .select('id, contenu, created_at, profiles(pseudo), chapitres(numero, romans(titre, slug))')
    .order('created_at', { ascending: false })
    .limit(12)

  const { data: likes } = await supabase
    .from('likes')
    .select('created_at, profiles(pseudo), chapitres(numero, romans(titre, slug))')
    .order('created_at', { ascending: false })
    .limit(12)

  const activite = [
    ...(commentaires ?? []).map((c) => ({
      type: 'commentaire',
      date: c.created_at,
      pseudo: c.profiles?.pseudo,
      roman: c.chapitres?.romans?.titre,
      slug: c.chapitres?.romans?.slug,
      numero: c.chapitres?.numero,
      contenu: c.contenu,
    })),
    ...(likes ?? []).map((l) => ({
      type: 'like',
      date: l.created_at,
      pseudo: l.profiles?.pseudo,
      roman: l.chapitres?.romans?.titre,
      slug: l.chapitres?.romans?.slug,
      numero: l.chapitres?.numero,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15)

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-3">Communauté</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        Discutez des romans, échangez vos impressions, retrouvez d'autres lecteurs.
      </p>

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Activité récente</p>
      <ul className="divide-y divide-ligne mb-14">
        {activite.map((a, i) => (
          <li key={i} className="py-4 text-sm">
            <a href={`/profil/${a.pseudo ?? ''}`} className="text-papier font-mono text-xs uppercase tracking-wide hover:text-or transition-colors">
              {a.pseudo ?? 'Lecteur'}
            </a>
            <span className="text-papier/35">
              {a.type === 'like' ? ' a aimé ' : ' a réagi à '}
            </span>
            <a href={`/roman/${a.slug}?ch=${a.numero}`} className="text-papier/60 hover:text-or transition-colors">
              « {a.roman} », chapitre {a.numero}
            </a>
            {a.type === 'commentaire' && a.contenu && (
              <p className="text-papier/70 mt-1.5 leading-relaxed">{a.contenu}</p>
            )}
          </li>
        ))}
        {activite.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-4">Rien pour l'instant — sois le premier à réagir à un chapitre.</p>
        )}
      </ul>

      <div className="filet-or mb-8" />

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Discussions</p>
      <ul className="divide-y divide-ligne">
        {(discussions ?? []).map((d) => (
          <li key={d.id} className="py-5">
            <p className="text-papier text-lg font-display">{d.titre}</p>
            {d.romans?.titre && (
              <p className="text-xs text-or font-mono uppercase tracking-wide mt-1.5">
                à propos de « {d.romans.titre} »
              </p>
            )}
          </li>
        ))}
        {(!discussions || discussions.length === 0) && (
          <p className="text-papier/30 text-sm font-mono py-6">Aucune discussion pour le moment.</p>
        )}
      </ul>
    </div>
  )
}
