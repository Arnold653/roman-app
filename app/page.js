import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: romans } = await supabase
    .from('romans')
    .select('id, titre, slug, resume, genre, couverture_url, statut')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <p className="text-braise text-xs uppercase tracking-widest mb-3">Un nouveau chapitre chaque semaine</p>
      <h1 className="font-display text-4xl md:text-6xl text-papier mb-4 leading-tight">
        Des histoires qui<br />se lisent à plusieurs.
      </h1>
      <p className="text-papier/60 mb-10 max-w-xl">
        Suis un roman chapitre après chapitre, échange avec d'autres lecteurs,
        et retrouve ceux qui partagent tes lectures.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(romans ?? []).map((roman) => (
          <a
            key={roman.id}
            href={`/roman/${roman.slug}`}
            className="group block rounded-lg border border-white/10 overflow-hidden hover:border-braise/50 transition-colors"
          >
            <div className="aspect-[3/4] bg-white/5 flex items-end p-4">
              {roman.couverture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roman.couverture_url} alt={roman.titre} className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <span className="relative text-xs uppercase tracking-wide text-braise">
                {roman.genre}
              </span>
            </div>
            <div className="p-4">
              <h2 className="font-display text-xl text-papier group-hover:text-braise transition-colors">
                {roman.titre}
              </h2>
              <p className="text-sm text-papier/50 mt-1 line-clamp-2">{roman.resume}</p>
            </div>
          </a>
        ))}

        {(!romans || romans.length === 0) && (
          <p className="text-papier/40 text-sm">
            Aucun roman publié pour le moment. Ajoute-en un dans Supabase pour le voir apparaître ici.
          </p>
        )}
      </div>
    </div>
  )
}
