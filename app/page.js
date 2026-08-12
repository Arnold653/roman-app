import { createClient } from '@/lib/supabase/server'
import RangStories from '@/components/RangStories'

// Dégradés générés automatiquement pour chaque couverture de roman — cohérents avec la charte (bleu / charbon).
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
      <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.05) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent 45%, rgba(0,0,0,0.35) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      <span className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.16] select-none pointer-events-none italic" aria-hidden="true" style={{ WebkitTextStroke: '1px rgba(233,234,234,0.22)' }}>
        {initiale}
      </span>
      <div className="absolute inset-[6px] border border-papier/[0.12] pointer-events-none" />
      <div className="absolute left-5 top-5 w-8 h-[1.5px] bg-papier/40" />
    </>
  )
}

// Couverture des livres (non-fiction / PDF) : plus sobre que celle des romans, avec une
// tranche colorée en bordure gauche façon reliure, pour rester visuellement distincte
// du rayon "Romans" au premier coup d'œil.
function CouvertureLivre({ titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #26292d 0%, #17191c 60%, #0d0f12 100%)' }} />
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-or/50" />
      <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      <span className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.14] select-none pointer-events-none italic" aria-hidden="true">
        {initiale}
      </span>
      <div className="absolute inset-[6px] border border-papier/[0.1] pointer-events-none" />
    </>
  )
}

export default async function HomePage() {
  const supabase = createClient()

  const [{ data: romans }, { data: livres }, { data: { user } }] = await Promise.all([
    supabase.from('romans').select('id, titre, slug, resume, genre, couverture_url, statut').order('created_at', { ascending: false }),
    supabase.from('livres').select('id, titre, slug, auteur, genre, description').order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  // "Reprendre" : mélange romans et livres selon la dernière position de lecture réelle de
  // l'utilisateur, tous types confondus, triés par date — pas une bannière décorative.
  let reprendre = []
  if (user) {
    const [{ data: progRomans }, { data: progLivres }] = await Promise.all([
      supabase.from('lecture_progress').select('dernier_chapitre, updated_at, romans(titre, slug)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
      supabase.from('lecture_progress_livres').select('derniere_section, updated_at, livres(titre, slug, contenu_extrait)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
    ])

    const itemsRomans = (progRomans || [])
      .filter((p) => p.romans)
      .map((p) => ({
        type: 'Roman', titre: p.romans.titre, sousTitre: `Chapitre ${p.dernier_chapitre}`,
        href: `/roman/${p.romans.slug}`, updated_at: p.updated_at,
      }))

    const itemsLivres = (progLivres || [])
      .filter((p) => p.livres)
      .map((p) => {
        const label = p.livres.contenu_extrait?.sections?.[p.derniere_section]?.pilLabel
        return {
          type: 'Livre', titre: p.livres.titre, sousTitre: label || `Section ${p.derniere_section + 1}`,
          href: `/livres/${p.livres.slug}`, updated_at: p.updated_at,
        }
      })

    reprendre = [...itemsRomans, ...itemsLivres]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 4)
  }

  // Bande Fil/Communauté : deux chiffres réels plutôt qu'un encart purement décoratif.
  const troisJours = new Date(Date.now() - 3 * 86400000).toISOString()
  const [{ count: commentairesRecents }, { count: nbLecteurs }] = await Promise.all([
    supabase.from('commentaires').select('*', { count: 'exact', head: true }).gte('created_at', troisJours),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="px-6 pt-20 pb-24 max-w-6xl mx-auto">
      <RangStories />

      <div className="lever max-w-2xl mb-16">
        <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-5">
          Un nouveau chapitre chaque semaine
        </p>
        <h1 className="font-display text-5xl md:text-7xl text-papier mb-6 leading-[1.05]">
          Des histoires<br />qui se lisent<br /><span className="text-or">et s'écoutent.</span>
        </h1>
        <p className="text-papier/55 text-lg leading-relaxed">
          Romans en épisodes, livres à lire ou écouter, et une communauté qui suit les mêmes pages que toi.
        </p>
      </div>

      {reprendre.length > 0 && (
        <div className="mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-4">Reprendre</p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x mandatory' }}>
            {reprendre.map((r, i) => (
              <a
                key={i}
                href={r.href}
                className="shrink-0 w-[230px] bg-encreClair border border-ligne rounded-lg p-4 hover:border-or/40 transition-colors"
                style={{ scrollSnapAlign: 'start' }}
              >
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-or mb-2 block">{r.type}</span>
                <h3 className="font-display text-[1.05rem] leading-tight mb-1 text-papier">{r.titre}</h3>
                <p className="text-papier/40 text-[0.78rem]">{r.sousTitre} · Reprendre →</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="filet-or mb-10" />

      <div className="flex items-baseline justify-between mb-8">
        <h2 className="font-display text-2xl text-papier">Romans</h2>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40">
          {(romans ?? []).length} disponible{(romans ?? []).length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
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

      {livres && livres.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-papier">Livres</h2>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40">
              {livres.length} disponible{livres.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {livres.map((livre, i) => (
              <a key={livre.id} href={`/livres/${livre.slug}`} className="lever group block" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="relative aspect-[3/4.2] rounded-md overflow-hidden mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)]">
                  <CouvertureLivre titre={livre.titre} />
                  <div className="absolute inset-0 p-5 flex flex-col justify-between">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/80 border border-papier/30 rounded-full px-2.5 py-1 self-start bg-black/10 backdrop-blur-sm">
                      {livre.genre || 'Livre'}
                    </span>
                    <div>
                      <div className="w-6 h-[1.5px] bg-or/70 mb-3" />
                      <h2 className="font-display text-2xl text-papier leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                        {livre.titre}
                      </h2>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-papier/45 leading-relaxed line-clamp-2">
                  {livre.auteur ? `${livre.auteur} — ` : ''}{livre.description}
                </p>
              </a>
            ))}
          </div>
        </>
      )}

      <div className="bg-encreClair border border-ligne rounded-xl p-2 divide-y divide-ligne">
        <a href="/fil" className="flex items-center justify-between px-4 py-4 hover:bg-encre/40 rounded-lg transition-colors">
          <div>
            <p className="text-papier/85 text-sm">
              {commentairesRecents > 0 ? `${commentairesRecents} commentaire${commentairesRecents > 1 ? 's' : ''} ces 3 derniers jours` : 'Rejoins la conversation'}
            </p>
            <p className="text-papier/40 text-xs font-mono mt-0.5">Fil</p>
          </div>
          <span className="text-papier/30">→</span>
        </a>
        <a href="/communaute" className="flex items-center justify-between px-4 py-4 hover:bg-encre/40 rounded-lg transition-colors">
          <div>
            <p className="text-papier/85 text-sm">{nbLecteurs || 0} lecteur{nbLecteurs > 1 ? 's' : ''} sur Encre</p>
            <p className="text-papier/40 text-xs font-mono mt-0.5">Communauté</p>
          </div>
          <span className="text-papier/30">→</span>
        </a>
      </div>
    </div>
  )
}
