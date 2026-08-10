import { createClient } from '@/lib/supabase/server'
import CommentSection from '@/components/CommentSection'
import CorpsChapitre from '@/components/CorpsChapitre'
import BoutonLike from '@/components/BoutonLike'
import SuiviLecture from '@/components/SuiviLecture'

export default async function RomanPage({ params, searchParams }) {
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
  const numeroDemande = searchParams?.ch ? Number(searchParams.ch) : dernier?.numero
  const courant = chapitres?.find((c) => c.numero === numeroDemande) || dernier
  const index = chapitres?.findIndex((c) => c.id === courant?.id) ?? -1
  const precedent = index > 0 ? chapitres[index - 1] : null
  const suivant = index >= 0 && index < (chapitres?.length ?? 0) - 1 ? chapitres[index + 1] : null

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
      {courant?.numero === chapitres?.[0]?.numero ? (
        <div className="mb-12 lever">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
            {roman.genre}
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-3 leading-tight">{roman.titre}</h1>
          <p className="text-papier/50 leading-relaxed">{roman.resume}</p>
        </div>
      ) : (
        <div className="mb-10 lever flex items-baseline justify-between gap-4">
          <h1 className="font-display text-2xl text-papier/70">{roman.titre}</h1>
          <a href={`/roman/${roman.slug}?ch=${chapitres?.[0]?.numero}`} className="text-xs font-mono text-papier/30 hover:text-or transition-colors shrink-0">
            Voir le résumé
          </a>
        </div>
      )}

      {chapitres && chapitres.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12">
          {chapitres.map((c) => (
            <a
              key={c.id}
              href={`/roman/${roman.slug}?ch=${c.numero}`}
              className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                c.id === courant?.id ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
              }`}
            >
              Ch. {c.numero}
            </a>
          ))}
        </div>
      )}

      {courant ? (
        <article className="lever">
          <SuiviLecture romanId={roman.id} numeroChapitre={courant.numero} />
          <div className="filet-or mb-8" />
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-2">
            Chapitre {courant.numero}
          </p>
          {courant.titre && (
            <h2 className="font-display text-3xl text-papier mb-8">{courant.titre}</h2>
          )}

          <CorpsChapitre texte={courant.contenu} />

          {courant.citation_fin && (
            <p className="mt-12 font-display italic text-xl text-papier/60 border-l-2 border-or/50 pl-5">
              {courant.citation_fin}
            </p>
          )}

          <div className="mt-10">
            <BoutonLike chapitreId={courant.id} />
          </div>

          {(precedent || suivant) && (
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-ligne font-mono text-sm">
              {precedent ? (
                <a href={`/roman/${roman.slug}?ch=${precedent.numero}`} className="text-papier/50 hover:text-or transition-colors">
                  ← Chapitre {precedent.numero}
                </a>
              ) : <span />}
              {suivant ? (
                <a href={`/roman/${roman.slug}?ch=${suivant.numero}`} className="text-papier/50 hover:text-or transition-colors">
                  Chapitre {suivant.numero} →
                </a>
              ) : <span />}
            </div>
          )}

          <CommentSection chapitreId={courant.id} />
        </article>
      ) : (
        <p className="text-papier/35 font-mono text-sm">Premier chapitre à venir bientôt.</p>
      )}
    </div>
  )
}
