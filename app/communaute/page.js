import { createClient } from '@/lib/supabase/server'

export default async function CommunautePage() {
  const supabase = createClient()
  const { data: discussions } = await supabase
    .from('discussions')
    .select('id, titre, created_at, romans(titre)')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-3">Communauté</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        Discutez des romans, échangez vos impressions, retrouvez d'autres lecteurs.
      </p>

      <div className="filet-or mb-8" />

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
