import { createClient } from '@/lib/supabase/server'
import { CouvertureGeneree } from '@/components/Couvertures'
import { degradeDe } from '@/lib/couvertures'

export default async function RomansPage() {
  const supabase = createClient()
  const { data: romans } = await supabase
    .from('romans')
    .select('id, titre, slug, resume, genre, couverture_url')
    .eq('statut_visibilite', 'publie')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 pt-20 pb-24 max-w-6xl mx-auto">
      <div className="lever max-w-2xl mb-14">
        <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
        <h1 className="font-display text-4xl md:text-5xl text-papier mb-4 leading-tight">Romans</h1>
        <p className="text-papier/50 leading-relaxed">
          Des histoires publiées chapitre par chapitre, à lire ou à écouter au fil de leur sortie.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {(romans ?? []).map((roman, i) => (
          <a key={roman.id} href={`/roman/${roman.slug}`} className="lever group block" style={{ animationDelay: `${i * 60}ms` }}>
            <div
              className="relative aspect-[3/4.2] rounded-md overflow-hidden mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)]"
              style={{ background: roman.couverture_url ? undefined : `linear-gradient(160deg, ${degradeDe(roman.id)[0]} 0%, ${degradeDe(roman.id)[1]} 55%, ${degradeDe(roman.id)[2]} 100%)` }}
            >
              {roman.couverture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roman.couverture_url} alt={roman.titre} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CouvertureGeneree id={roman.id} titre={roman.titre} />
              )}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/30" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/80 border border-papier/30 rounded-full px-2.5 py-1 self-start bg-black/10 backdrop-blur-sm">
                  {roman.genre}
                </span>
                <div>
                  <div className="w-6 h-[1.5px] bg-or/70 mb-3" />
                  <h2 className="font-display text-2xl text-papier leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                    {roman.titre}
                  </h2>
                </div>
              </div>
            </div>
            <p className="text-sm text-papier/45 leading-relaxed line-clamp-2">{roman.resume}</p>
          </a>
        ))}

        {(!romans || romans.length === 0) && (
          <p className="text-papier/35 text-sm font-mono">Aucun roman publié pour le moment.</p>
        )}
      </div>
    </div>
  )
}
