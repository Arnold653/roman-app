// Page de repli servie par le service worker (public/sw.js) quand une page de lecture demandée
// hors connexion n'a jamais été mise en cache — jamais affichée en navigation normale en ligne,
// donc pas besoin d'y faire de requête Supabase.
export const metadata = {
  title: 'Hors connexion — Encre',
}

export default function HorsLignePage() {
  return (
    <div className="px-6 py-24 max-w-md mx-auto text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-or mb-4">Hors connexion</p>
      <h1 className="font-display text-3xl text-papier mb-4 leading-tight">
        Cette page n'a pas encore été enregistrée.
      </h1>
      <p className="text-papier/60 leading-relaxed mb-8">
        Les romans, livres et contes déjà ouverts au moins une fois restent lisibles sans
        connexion. Celui-ci ne l'a pas encore été — retrouve-le une fois de retour en ligne, il
        restera disponible hors connexion ensuite.
      </p>
      <a
        href="/"
        className="inline-block font-mono text-xs uppercase tracking-widest bg-or text-encre rounded-full px-6 py-3.5 hover:brightness-110 transition-all"
      >
        Retour à l'accueil
      </a>
    </div>
  )
}
