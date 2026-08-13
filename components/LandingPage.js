import { degradeDe } from '@/lib/couvertures'

function formatDelai(ms) {
  const heures = Math.round(ms / 3_600_000)
  if (heures < 1) return 'dans quelques minutes'
  if (heures < 24) return `dans ${heures} h`
  const jours = Math.round(heures / 24)
  return `dans ${jours} jour${jours > 1 ? 's' : ''}`
}

function CouvertureMini({ id, titre, type }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()
  const [d1, d2, d3] = degradeDe(id || titre || '')
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: type === 'livre' ? 'linear-gradient(160deg, #26292d 0%, #17191c 60%, #0d0f12 100%)' : `linear-gradient(150deg, ${d1} 0%, ${d2} 55%, ${d3} 100%)` }}
      />
      {type === 'livre' && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-or/50" />}
      <div className="absolute inset-0 opacity-[0.13] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />
      <span className="font-display absolute right-3 top-3 text-3xl leading-none text-papier/[0.16] select-none pointer-events-none italic">{initiale}</span>
      <div className="absolute inset-[5px] border border-papier/[0.1] pointer-events-none" />
    </div>
  )
}

const ATOUTS = [
  {
    glyphe: '✒︎',
    titre: 'Un rendez-vous, pas un flux',
    texte: "Les romans sortent par épisodes, à date fixe. On y revient, on ne fait pas juste défiler.",
  },
  {
    glyphe: '☊',
    titre: 'À lire ou à écouter',
    texte: "Chaque chapitre se lit à l'œil ou s'écoute les mains libres — narration intégrée, sans app tierce.",
  },
  {
    glyphe: '✦',
    titre: 'Des sorties en direct',
    texte: 'Un compte à rebours avant chaque nouveau chapitre, une notification pile à l\'heure — pas une date qui passe inaperçue.',
  },
  {
    glyphe: '✎',
    titre: 'Une communauté qui commente',
    texte: 'Réactions, discussions, profils de lecteurs — chaque chapitre se discute autant qu\'il se lit.',
  },
]

export default function LandingPage({ prochaineSortie, vitrine, nbLecteurs }) {
  return (
    <div className="min-h-screen">
      {/* --- Nav --- */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className="flex items-center gap-2 font-display text-xl text-papier">
          <span className="text-or">💧</span> Encre
        </span>
        <a
          href="/login"
          className="font-mono text-xs uppercase tracking-widest text-papier/60 hover:text-or transition-colors border border-ligne hover:border-or/40 rounded-full px-4 py-2"
        >
          Se connecter
        </a>
      </header>

      {/* --- Hero --- */}
      <section className="px-6 pt-10 pb-16 max-w-6xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-or mb-5">
          Romans en épisodes · Livres à lire ou écouter
        </p>
        <h1 className="font-display text-[2.7rem] leading-[1.05] sm:text-6xl sm:leading-[1.05] text-papier max-w-2xl">
          La prochaine page <span className="text-or italic">s'écrit</span> avec vous.
        </h1>
        <p className="text-papier/55 leading-relaxed mt-6 max-w-md text-lg font-body">
          Des histoires publiées épisode après épisode, des livres complets à lire ou à écouter,
          et une communauté qui tourne les pages en même temps que vous.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-9">
          <a
            href="/login"
            className="font-mono text-xs uppercase tracking-widest bg-or text-encre rounded-full px-6 py-3.5 hover:brightness-110 transition-all"
          >
            Créer un compte gratuit
          </a>
          <a
            href="#catalogue"
            className="font-mono text-xs uppercase tracking-widest text-papier/60 hover:text-or transition-colors"
          >
            Voir le catalogue ↓
          </a>
        </div>

        {/* Signature : preuve vivante que la maison publie vraiment, pas une promesse abstraite */}
        {prochaineSortie && (
          <div className="mt-12 inline-flex items-center gap-4 rounded-2xl border border-or/25 bg-encreClair/60 px-5 py-4 max-w-md">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-or opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-or" />
            </span>
            <p className="text-sm text-papier/70 leading-snug">
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or block mb-0.5">Prochaine sortie</span>
              « {prochaineSortie.roman} » — chapitre {prochaineSortie.numero}, {formatDelai(prochaineSortie.dansMs)}
            </p>
          </div>
        )}
      </section>

      {/* --- Catalogue réel --- */}
      {vitrine.length > 0 && (
        <section id="catalogue" className="px-6 pb-16 max-w-6xl mx-auto scroll-mt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-4">Déjà sur Encre</p>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {vitrine.map((item) => (
              <a
                key={`${item.type}-${item.id}`}
                href={`/login?suite=/${item.type === 'livre' ? 'livres' : 'roman'}/${item.slug}`}
                className="group shrink-0 w-[150px]"
              >
                <div className="w-full aspect-[3/4.4] rounded-lg overflow-hidden border border-ligne group-hover:border-or/40 transition-colors">
                  <CouvertureMini id={item.id} titre={item.titre} type={item.type} />
                </div>
                <p className="font-mono text-[0.6rem] uppercase tracking-widest text-or/70 mt-2.5">
                  {item.type === 'livre' ? 'Livre' : 'Roman'}
                </p>
                <h3 className="font-display text-sm text-papier leading-snug mt-0.5 line-clamp-2">{item.titre}</h3>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* --- Atouts --- */}
      <section className="px-6 py-16 border-t border-ligne">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
            {ATOUTS.map((a) => (
              <div key={a.titre}>
                <span className="text-or text-xl">{a.glyphe}</span>
                <h3 className="font-display text-xl text-papier mt-3 mb-2">{a.titre}</h3>
                <p className="text-papier/50 leading-relaxed text-sm font-body">{a.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Transparence --- */}
      <section className="px-6 py-16 border-t border-ligne">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-or mb-3">Transparence</p>
            <h2 className="font-display text-2xl sm:text-3xl text-papier leading-snug max-w-lg">
              Certains textes sont rédigés avec l'aide de l'IA — et vérifiés par une personne avant publication.
            </h2>
            <p className="text-papier/50 leading-relaxed text-sm font-body mt-4 max-w-lg">
              Chaque roman ou livre concerné porte un badge visible, avec le nom de la personne
              qui l'a relu quand elle a choisi de le préciser. Rien de caché.
            </p>
          </div>
          <div className="inline-flex items-start gap-1.5 text-[0.7rem] font-mono text-papier/40 border border-ligne rounded-xl px-4 py-3 shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0">
              <path d="M12 2l2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2z" strokeLinejoin="round" />
            </svg>
            <span>Rédigé avec l'aide de l'IA<br />Vérifié par l'équipe éditoriale</span>
          </div>
        </div>
      </section>

      {/* --- CTA final --- */}
      <section className="px-6 py-20 border-t border-ligne text-center">
        <h2 className="font-display text-3xl sm:text-4xl text-papier max-w-lg mx-auto leading-tight">
          Le premier chapitre attend.
        </h2>
        {nbLecteurs > 0 && (
          <p className="text-papier/40 font-mono text-xs uppercase tracking-widest mt-4">
            {nbLecteurs}+ lecteurs déjà inscrits
          </p>
        )}
        <a
          href="/login"
          className="inline-block font-mono text-xs uppercase tracking-widest bg-or text-encre rounded-full px-7 py-4 hover:brightness-110 transition-all mt-8"
        >
          Créer un compte gratuit
        </a>
      </section>

      <footer className="px-6 py-8 border-t border-ligne text-center">
        <p className="font-mono text-[0.65rem] text-papier/25">Encre — romans en épisodes & livres, à lire ou à écouter.</p>
      </footer>
    </div>
  )
}
