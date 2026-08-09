import { createClient } from '@/lib/supabase/server'
import CommentSection from '@/components/CommentSection'

export default async function RomanPage({ params }) {
  const supabase = createClient()

  const { data: roman } = await supabase
    .from('romans')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!roman) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Roman introuvable.</div>
  }

  const { data: chapitres } = await supabase
    .from('chapitres')
    .select('*')
    .eq('roman_id', roman.id)
    .order('numero', { ascending: true })

  const dernier = chapitres?.[chapitres.length - 1]

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
      <div className="mb-12 lever">
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
          {roman.genre}
        </span>
        <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-3 leading-tight">{roman.titre}</h1>
        <p className="text-papier/50 leading-relaxed">{roman.resume}</p>
      </div>

      {chapitres && chapitres.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12">
          {chapitres.map((c) => (
            <span
              key={c.id}
              className={`font-mono text-xs rounded-full px-3 py-1 border ${
                c.id === dernier.id ? 'border-or text-or' : 'border-papier/15 text-papier/35'
              }`}
            >
              Ch. {c.numero}
            </span>
          ))}
        </div>
      )}

      {dernier ? (
        <article className="lever">
          <div className="filet-or mb-8" />
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-2">
            Chapitre {dernier.numero}
          </p>
          {dernier.titre && (
            <h2 className="font-display text-3xl text-papier mb-8">{dernier.titre}</h2>
          )}

          <div className="lettrine text-papier/85 text-[1.05rem] leading-[1.85] whitespace-pre-wrap">
            {dernier.contenu}
          </div>

          {dernier.citation_fin && (
            <p className="mt-12 font-display italic text-xl text-papier/60 border-l-2 border-or/50 pl-5">
              {dernier.citation_fin}
            </p>
          )}

          <CommentSection chapitreId={dernier.id} />
        </article>
      ) : (
        <p className="text-papier/35 font-mono text-sm">Premier chapitre à venir bientôt.</p>
      )}
    </div>
  )
}
