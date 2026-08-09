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
    return <div className="px-6 py-16 text-papier/60">Roman introuvable.</div>
  }

  const { data: chapitres } = await supabase
    .from('chapitres')
    .select('*')
    .eq('roman_id', roman.id)
    .order('numero', { ascending: true })

  const dernier = chapitres?.[chapitres.length - 1]

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <p className="text-xs uppercase tracking-wide text-braise mb-2">{roman.genre}</p>
      <h1 className="font-display text-4xl text-papier mb-3">{roman.titre}</h1>
      <p className="text-papier/60 mb-10">{roman.resume}</p>

      {dernier ? (
        <article className="border-t border-white/10 pt-8">
          <h2 className="font-display text-2xl text-papier mb-1">
            Chapitre {dernier.numero}{dernier.titre ? ` — ${dernier.titre}` : ''}
          </h2>
          <div className="prose prose-invert prose-p:text-papier/85 mt-6 whitespace-pre-wrap leading-relaxed">
            {dernier.contenu}
          </div>

          {dernier.citation_fin && (
            <p className="mt-10 italic text-papier/50 border-l-2 border-braise/50 pl-4">
              {dernier.citation_fin}
            </p>
          )}

          <CommentSection chapitreId={dernier.id} />
        </article>
      ) : (
        <p className="text-papier/40">Premier chapitre à venir bientôt.</p>
      )}
    </div>
  )
}
