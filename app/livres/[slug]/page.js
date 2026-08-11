import { createClient } from '@/lib/supabase/server'
import BadgeTransparence from '@/components/BadgeTransparence'
import LecteurPDF from '@/components/LecteurPDF'

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
      {livre.auteur && <p className="text-papier/40 font-mono text-sm mb-4">{livre.auteur}</p>}

      {livre.description && <p className="text-papier/60 leading-relaxed mb-6">{livre.description}</p>}

      <div className="mb-8">
        <BadgeTransparence generePar={livre.genere_par_ia} verifiePar={livre.verifie_par} />
      </div>

      <LecteurPDF url={livre.fichier_url} />
    </div>
  )
}
