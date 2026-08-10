import { createClient } from '@/lib/supabase/server'

// Dégradés générés automatiquement pour chaque couverture — cohérents avec la charte (bleu / charbon).
// Aucune image à créer : la teinte est dérivée de l'id du roman, stable dans le temps.
const DEGRADES = [
  ['#0079db', '#0a1a2e'],
  ['#1c8fe8', '#12141c'],
  ['#004a91', '#0d0f12'],
  ['#3aa6f0', '#0a1220'],
  ['#0d5fae', '#171a1e'],
]

function degradeDe(id) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DEGRADES[n % DEGRADES.length]
}

function CouvertureGeneree({ titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      {/* Monogramme géant en filigrane — écho de la lettrine utilisée dans les chapitres */}
      <span
        className="font-display absolute -right-3 -bottom-8 text-[9rem] leading-none text-papier/[0.07] select-none pointer-events-none"
        aria-hidden="true"
      >
        {initiale}
      </span>
      {/* Grain discret, cohérent avec le fond du site */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(233,234,234,0.09) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="absolute left-5 top-5 w-8 h-[1.5px] bg-papier/30" />
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
              className="relative aspect-[3/4.2] rounded-sm overflow-hidden mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)]"
              style={{
                background: roman.couverture_url
                  ? undefined
                  : `linear-gradient(155deg, ${degradeDe(roman.id)[0]} 0%, ${degradeDe(roman.id)[1]} 130%)`,
              }}
            >
              {roman.couverture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roman.couverture_url} alt={roman.titre} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CouvertureGeneree titre={roman.titre} />
              )}
              {/* tranche du livre */}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/25" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/70 border border-papier/25 rounded-full px-2.5 py-1 self-start">
                  {roman.genre}
                </span>
                <h2 className="font-display text-2xl text-papier leading-tight">
                  {roman.titre}
                </h2>
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
