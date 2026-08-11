import { createClient } from '@/lib/supabase/server'
import BadgeTransparence from '@/components/BadgeTransparence'

export default async function LivreDetailPage({ params }) {
  const supabase = createClient()
  const { data: livre } = await supabase.from('livres').select('*').eq('slug', params.slug).single()

  if (!livre) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Livre introuvable.</div>
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      {livre.genre && (
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
          {livre.genre}
        </span>
      )}
      <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-2 leading-tight">{livre.titre}</h1>
      {livre.auteur && <p className="text-papier/40 font-mono text-sm mb-6">{livre.auteur}</p>}

      {livre.description && <p className="text-papier/60 leading-relaxed mb-8">{livre.description}</p>}

      <a
        href={livre.fichier_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-or text-encre font-medium rounded-full px-6 py-3 hover:brightness-110 transition-all mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Télécharger le PDF
      </a>

      <div>
        <BadgeTransparence generePar={livre.genere_par_ia} verifiePar={livre.verifie_par} />
      </div>
    </div>
  )
}
