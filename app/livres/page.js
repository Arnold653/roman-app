import { createClient } from '@/lib/supabase/server'
import BadgeTransparence from '@/components/BadgeTransparence'

const DEGRADES = [
  ['#1c9bf0', '#0b3a6b', '#050b16'],
  ['#3ab0ff', '#0d3050', '#08101c'],
  ['#0d6fc4', '#0a2540', '#050a12'],
  ['#4fb3ff', '#0a2c52', '#060c16'],
  ['#1584dd', '#0e2038', '#070d16'],
]

function degradeDe(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DEGRADES[n % DEGRADES.length]
}

export default async function LivresPage() {
  const supabase = createClient()
  const { data: livres } = await supabase.from('livres').select('*').eq('statut', 'publie').order('created_at', { ascending: false })

  return (
    <div className="px-6 pt-20 pb-24 max-w-6xl mx-auto">
      <div className="lever max-w-2xl mb-14">
        <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
        <h1 className="font-display text-4xl md:text-5xl text-papier mb-4 leading-tight">Livres</h1>
        <p className="text-papier/50 leading-relaxed">
          Des ouvrages complets, à télécharger et lire en entier — à la différence des romans publiés chapitre par chapitre.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
        {livres?.map((livre) => (
          <a key={livre.id} href={`/livres/${livre.slug}`} className="group">
            <div
              className="relative aspect-[3/4.2] rounded-md overflow-hidden mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)]"
              style={{ background: `linear-gradient(160deg, ${degradeDe(livre.id)[0]} 0%, ${degradeDe(livre.id)[1]} 55%, ${degradeDe(livre.id)[2]} 100%)` }}
            >
              <span className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.16] select-none italic" style={{ WebkitTextStroke: '1px rgba(233,234,234,0.22)' }}>
                {livre.titre?.charAt(0).toUpperCase()}
              </span>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent 45%, rgba(0,0,0,0.35) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/30" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                {livre.genre && (
                  <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/80 border border-papier/30 rounded-full px-2.5 py-1 self-start bg-black/10 backdrop-blur-sm">
                    {livre.genre}
                  </span>
                )}
                <div>
                  <div className="w-6 h-[1.5px] bg-or/70 mb-3" />
                  <h2 className="font-display text-2xl text-papier leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{livre.titre}</h2>
                  {livre.auteur && <p className="text-papier/60 text-xs mt-1 font-mono">{livre.auteur}</p>}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {(!livres || livres.length === 0) && (
        <p className="text-papier/30 text-sm font-mono">Aucun livre publié pour l'instant.</p>
      )}
    </div>
  )
}
