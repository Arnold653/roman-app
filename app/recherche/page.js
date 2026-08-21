import { createClient } from '@/lib/supabase/server'
import { CouvertureGeneree, CouvertureLivre, CouvertureConteAfricain, CouvertureConteEnfant } from '@/components/Couvertures'

const CONFIG_PAR_TYPE = {
  roman: { table: 'romans', statutCol: 'statut_visibilite', href: '/roman', label: 'Roman', Couverture: CouvertureGeneree },
  livre: { table: 'livres', statutCol: 'statut', href: '/livres', label: 'Livre', Couverture: CouvertureLivre },
  'conte-africain': { table: 'contes_africains', statutCol: 'statut', href: '/contes-africains', label: 'Conte', Couverture: CouvertureConteAfricain },
  'conte-enfant': { table: 'contes_enfants', statutCol: 'statut', href: '/contes-enfants', label: 'Histoire', Couverture: CouvertureConteEnfant },
}

export default async function RecherchePage({ searchParams }) {
  const q = (searchParams?.q || '').trim()
  const supabase = createClient()

  let resultats = []
  if (q.length >= 2) {
    const reponses = await Promise.all(
      Object.entries(CONFIG_PAR_TYPE).map(([type, config]) => {
        const champs = type === 'roman' ? 'id, titre, slug, genre, couverture_url' : 'id, titre, slug, auteur, genre, couverture_url'
        const filtre = type === 'roman' ? `titre.ilike.%${q}%,genre.ilike.%${q}%` : `titre.ilike.%${q}%,auteur.ilike.%${q}%,genre.ilike.%${q}%`
        return supabase.from(config.table).select(champs).eq(config.statutCol, 'publie').or(filtre).limit(20)
      })
    )
    resultats = Object.keys(CONFIG_PAR_TYPE).flatMap((type, i) =>
      (reponses[i].data ?? []).map((item) => ({ ...item, type }))
    )
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-8">Rechercher</h1>

      <form method="GET" className="mb-10">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Titre, auteur, genre…"
          autoFocus
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier placeholder:text-papier/30 focus:outline-none focus:border-or transition-colors"
        />
      </form>

      {q.length > 0 && q.length < 2 && (
        <p className="text-papier/30 text-sm font-mono">Encore un caractère ou deux…</p>
      )}

      {q.length >= 2 && resultats.length === 0 && (
        <p className="text-papier/30 text-sm font-mono">Rien trouvé pour « {q} ».</p>
      )}

      {resultats.length > 0 && (
        <ul className="divide-y divide-ligne">
          {resultats.map((item) => {
            const config = CONFIG_PAR_TYPE[item.type]
            const Couverture = config.Couverture
            return (
              <li key={`${item.type}-${item.id}`}>
                <a href={`${config.href}/${item.slug}`} className="flex items-center gap-3 py-3 group min-w-0">
                  <div className="relative overflow-hidden rounded-md w-11 h-14 shrink-0">
                    <Couverture id={item.id} titre={item.titre} couvertureUrl={item.couverture_url} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[0.6rem] uppercase tracking-widest text-or/70">{config.label}</p>
                    <p className="text-papier font-display text-base truncate group-hover:text-or transition-colors">{item.titre}</p>
                    {item.genre && <p className="text-papier/35 text-xs font-mono truncate">{item.genre}</p>}
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
