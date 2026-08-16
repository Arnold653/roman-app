import { CouvertureGeneree, CouvertureLivre, CouvertureConteAfricain, CouvertureConteEnfant } from '@/components/Couvertures'

function formatDelai(ms) {
  const heures = Math.round(ms / 3_600_000)
  if (heures < 1) return 'dans quelques minutes'
  if (heures < 24) return `dans ${heures} h`
  const jours = Math.round(heures / 24)
  return `dans ${jours} jour${jours > 1 ? 's' : ''}`
}

const HREF_PAR_TYPE = {
  roman: '/roman',
  livre: '/livres',
  'conte-africain': '/contes-africains',
  'conte-enfant': '/contes-enfants',
}
const LABEL_PAR_TYPE = {
  roman: 'Roman',
  livre: 'Livre',
  'conte-africain': 'Conte',
  'conte-enfant': 'Histoire',
}

function CouvertureVitrine({ item }) {
  if (item.type === 'roman') return <CouvertureGeneree id={item.id} titre={item.titre} />
  if (item.type === 'conte-africain') return <CouvertureConteAfricain titre={item.titre} />
  if (item.type === 'conte-enfant') return <CouvertureConteEnfant titre={item.titre} />
  return <CouvertureLivre titre={item.titre} />
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
  {
    glyphe: '❖',
    titre: 'Un patrimoine qui se raconte encore',
    texte: "Des contes et histoires venus de tout le continent, à lire ou à écouter — la tradition orale trouve une nouvelle scène.",
  },
  {
    glyphe: '☾',
    titre: 'Un moment à partager avec un enfant',
    texte: "Des histoires pensées pour être écoutées blotti tout près, avec une voix, de grandes lettres et un vrai moment de calme.",
  },
]

export default function LandingPage({ prochaineSortie, vitrine, nbLecteurs }) {
  return (
    <div className="min-h-screen">
      {/* --- Hero --- */}
      <section className="px-6 pt-10 pb-16 max-w-6xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-or mb-5">
          Romans en épisodes · Livres, Contes & Histoires à lire ou écouter
        </p>
        <h1 className="font-display text-[2.7rem] leading-[1.05] sm:text-6xl sm:leading-[1.05] text-papier max-w-2xl">
          La prochaine page <span className="text-or italic">s'écrit</span> avec vous.
        </h1>
        <p className="text-papier/80 leading-relaxed mt-6 max-w-md text-lg font-body font-medium">
          Encre est une plateforme de lecture en français : des romans qui sortent épisode par
          épisode, des livres complets, et des contes à lire ou à écouter — gratuitement.
        </p>
        <p className="text-papier/50 leading-relaxed mt-3 max-w-md text-base font-body">
          Créez un compte, choisissez une histoire, lisez à l'œil ou laissez la voix vous la lire.
          Une communauté commente les chapitres au fur et à mesure qu'ils sortent.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-9">
          <a
            href="/login"
            className="font-mono text-xs uppercase tracking-widest bg-or text-encre rounded-full px-6 py-3.5 hover:brightness-110 transition-all"
          >
            Créer un compte gratuit
          </a>
          <a
            href="#comment-ca-marche"
            className="font-mono text-xs uppercase tracking-widest text-papier/60 hover:text-or transition-colors"
          >
            Comment ça marche ↓
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

      {/* --- Comment ça marche : explication en clair, avant tout le reste. Un ami qui a testé
           le lien à froid n'a rien compris ni sur cette page ni une fois connecté — cette
           section existe pour que ça n'arrive plus, indépendamment du reste du design. --- */}
      <section id="comment-ca-marche" className="px-6 py-16 border-t border-ligne scroll-mt-6">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-10">Comment ça marche</p>
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <span className="font-display text-3xl text-or/50">1</span>
              <h3 className="font-display text-xl text-papier mt-3 mb-2">Créez un compte gratuit</h3>
              <p className="text-papier/50 leading-relaxed text-sm font-body">
                Aucune carte bancaire nécessaire. L'essentiel du catalogue se lit gratuitement.
              </p>
            </div>
            <div>
              <span className="font-display text-3xl text-or/50">2</span>
              <h3 className="font-display text-xl text-papier mt-3 mb-2">Choisissez ce que vous lisez</h3>
              <p className="text-papier/50 leading-relaxed text-sm font-body">
                Un <strong className="text-papier/70 font-normal">roman</strong> qui sort épisode
                par épisode, un <strong className="text-papier/70 font-normal">livre</strong> complet
                à lire d'un bloc, ou un <strong className="text-papier/70 font-normal">conte</strong> —
                africain ou pour enfants.
              </p>
            </div>
            <div>
              <span className="font-display text-3xl text-or/50">3</span>
              <h3 className="font-display text-xl text-papier mt-3 mb-2">Lisez ou écoutez</h3>
              <p className="text-papier/50 leading-relaxed text-sm font-body">
                Sur votre téléphone, à l'œil ou avec la voix intégrée — reprenez toujours pile où
                vous vous étiez arrêté.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Catalogue réel --- */}
      {vitrine.length > 0 && (
        <section id="catalogue" className="px-6 pb-16 max-w-6xl mx-auto scroll-mt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-4">Déjà sur Encre</p>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {vitrine.map((item) => (
              <a
                key={`${item.type}-${item.id}`}
                href={`/login?suite=${HREF_PAR_TYPE[item.type]}/${item.slug}`}
                className="group shrink-0 w-[150px]"
              >
                <div className="relative w-full aspect-[3/4.4] rounded-lg overflow-hidden border border-ligne group-hover:border-or/40 transition-colors">
                  <CouvertureVitrine item={item} />
                </div>
                <p className="font-mono text-[0.6rem] uppercase tracking-widest text-or/70 mt-2.5">
                  {LABEL_PAR_TYPE[item.type]}
                </p>
                <h3 className="font-display text-sm text-papier leading-snug mt-0.5 line-clamp-2">{item.titre}</h3>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* --- Contes & Histoires : identité propre, mise en avant à part du catalogue générique
           ci-dessus, pour que la philosophie de ces deux sections ressorte vraiment (héritage
           oral pour les Contes Africains, rituel du soir pour les Contes Enfants) plutôt que de
           se fondre dans la vitrine Romans/Livres. --- */}
      <section className="px-6 py-16 border-t border-ligne">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-4">Contes & Histoires</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="/login?suite=/contes-africains"
              className="group relative overflow-hidden rounded-2xl p-8 min-h-[220px] flex flex-col justify-end"
              style={{ background: 'linear-gradient(150deg, #7a3b1e 0%, #4a2013 55%, #241009 100%)' }}
            >
              <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
              <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 20%, rgba(230,151,66,0.16) 0%, transparent 55%)' }} />
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#e69742] mb-2">Contes & Histoires Africaines</p>
              <h3 className="font-display text-2xl sm:text-3xl text-papier leading-tight mb-3 max-w-sm">
                La tradition orale, une nouvelle scène.
              </h3>
              <p className="text-papier/60 text-sm leading-relaxed max-w-sm mb-4">
                Contes traditionnels et histoires venues de tout le continent, région par région —
                à lire ou à écouter.
              </p>
              <span className="font-mono text-xs uppercase tracking-widest text-papier/70 group-hover:text-papier transition-colors inline-flex items-center gap-1.5">
                Découvrir <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </a>
            <a
              href="/login?suite=/contes-enfants"
              className="group relative overflow-hidden rounded-2xl p-8 min-h-[220px] flex flex-col justify-end"
              style={{ background: 'linear-gradient(145deg, #5b3a9e 0%, #3a2570 55%, #1f1440 100%)' }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(110% 85% at 50% 15%, rgba(255,209,102,0.2) 0%, transparent 50%)' }} />
              <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 60% at 85% 90%, rgba(45,212,191,0.16) 0%, transparent 60%)' }} />
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#ffd166] mb-2">Contes pour Enfants</p>
              <h3 className="font-display text-2xl sm:text-3xl text-papier leading-tight mb-3 max-w-sm">
                Un rituel du soir, pas un écran de plus.
              </h3>
              <p className="text-papier/60 text-sm leading-relaxed max-w-sm mb-4">
                Grandes lettres, voix chaleureuse, lecture qui démarre seule — de quoi raconter
                une histoire sans y penser deux fois.
              </p>
              <span className="font-mono text-xs uppercase tracking-widest text-papier/70 group-hover:text-papier transition-colors inline-flex items-center gap-1.5">
                Découvrir <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </a>
          </div>
        </div>
      </section>

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
        <p className="font-mono text-[0.65rem] text-papier/25">Encre — romans, livres, contes & histoires, à lire ou à écouter.</p>
      </footer>
    </div>
  )
}
