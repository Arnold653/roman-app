import { createClient } from '@/lib/supabase/server'
import RangStories from '@/components/RangStories'

// Dégradés générés automatiquement pour chaque couverture — cohérents avec la charte (bleu / charbon).
// Aucune image à créer : la teinte est dérivée de l'id du roman, stable dans le temps.
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

function CouvertureGeneree({ id, titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      {/* Sheen diagonal — reflet façon jaquette vernie */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.05) 100%)' }}
      />
      {/* Vignette — assombrit les coins pour un rendu plus "imprimé" */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent 45%, rgba(0,0,0,0.35) 100%)' }}
      />
      {/* Scrim bas — garantit la lisibilité du titre */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
      />
      {/* Grain fin */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
          backgroundSize: '3px 3px',
        }}
      />
      {/* Monogramme en filigrane — écho raffiné de la lettrine des chapitres */}
      <span
        className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.16] select-none pointer-events-none italic"
        aria-hidden="true"
        style={{ WebkitTextStroke: '1px rgba(233,234,234,0.22)' }}
      >
        {initiale}
      </span>
      {/* Cadre intérieur — fine bordure façon reliure premium */}
      <div className="absolute inset-[6px] border border-papier/[0.12] pointer-events-none" />
      <div className="absolute left-5 top-5 w-8 h-[1.5px] bg-papier/40" />
    </>
  )
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: romans } = await supabase
    .from('romans')
    .select('id, titre, slug, resume, genre, couverture_url, statut')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 pt-20 pb-24 max-w-6xl mx-auto">
      <RangStories />

      <div className="lever max-w-2xl mb-20">
        <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-5">
          Un nouveau chapitre chaque semaine
        </p>
        <h1 className="font-display text-5xl md:text-7xl text-papier mb-6 leading-[1.05]">
          Des histoires<br />qui se lisent<br /><span className="text-or">à plusieurs.</span>
        </h1>
        <p className="text-papier/55 text-lg leading-relaxed">
          Suis un roman chapitre après chapitre, échange avec d'autres lecteurs,
          et retrouve ceux qui partagent tes lectures.
        </p>
      </div>

      <div className="filet-or mb-10" />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-8">
        {(romans ?? []).length} roman{(romans ?? []).length > 1 ? 's' : ''} disponible{(romans ?? []).length > 1 ? 's' : ''}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {(romans ?? []).map((roman, i) => (
          <a
            key={roman.id}
            href={`/roman/${roman.slug}`}
            className="lever group block"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="relative aspect-[3/4.2] rounded-md overflow-hidden mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)]"
              style={{
                background: roman.couverture_url
                  ? undefined
                  : `linear-gradient(160deg, ${degradeDe(roman.id)[0]} 0%, ${degradeDe(roman.id)[1]} 55%, ${degradeDe(roman.id)[2]} 100%)`,
              }}
            >
              {roman.couverture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roman.couverture_url} alt={roman.titre} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CouvertureGeneree id={roman.id} titre={roman.titre} />
              )}
              {/* tranche du livre */}
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
          <p className="text-papier/35 text-sm font-mono">
            Aucun roman publié pour le moment.
          </p>
        )}
      </div>
    </div>
  )
}
