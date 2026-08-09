import { createClient } from '@/lib/supabase/server'

export default async function CommunautePage() {
  const supabase = createClient()
  const { data: discussions } = await supabase
    .from('discussions')
    .select('id, titre, created_at, romans(titre)')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <h1 className="font-display text-4xl text-papier mb-2">Communauté</h1>
      <p className="text-papier/60 mb-10">
        Discutez des romans, échangez vos impressions, retrouvez d'autres lecteurs.
      </p>

      <ul className="divide-y divide-white/10">
        {(discussions ?? []).map((d) => (
          <li key={d.id} className="py-4">
            <p className="text-papier">{d.titre}</p>
            {d.romans?.titre && (
              <p className="text-xs text-braise mt-1">à propos de « {d.romans.titre} »</p>
            )}
          </li>
        ))}
        {(!discussions || discussions.length === 0) && (
          <p className="text-papier/40 text-sm py-4">Aucune discussion pour le moment.</p>
        )}
      </ul>
    </div>
  )
}
