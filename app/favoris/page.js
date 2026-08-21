import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CouvertureGeneree, CouvertureLivre, CouvertureConteAfricain, CouvertureConteEnfant } from '@/components/Couvertures'

const CONFIG_PAR_TYPE = {
  roman: { table: 'romans', colonne: 'roman_id', href: '/roman', label: 'Roman', Couverture: CouvertureGeneree },
  livre: { table: 'livres', colonne: 'livre_id', href: '/livres', label: 'Livre', Couverture: CouvertureLivre },
  'conte-africain': { table: 'contes_africains', colonne: 'conte_africain_id', href: '/contes-africains', label: 'Conte', Couverture: CouvertureConteAfricain },
  'conte-enfant': { table: 'contes_enfants', colonne: 'conte_enfant_id', href: '/contes-enfants', label: 'Histoire', Couverture: CouvertureConteEnfant },
}

export default async function FavorisPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?suite=/favoris')

  const { data: favoris } = await supabase
    .from('favoris')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Un favori ne pointe que sur une seule des 4 colonnes cible (contrainte en base) —
  // on regroupe les ids par type pour aller chercher les titres en 4 requêtes max.
  const idsParType = { roman: [], livre: [], 'conte-africain': [], 'conte-enfant': [] }
  for (const f of favoris ?? []) {
    if (f.roman_id) idsParType.roman.push(f.roman_id)
    else if (f.livre_id) idsParType.livre.push(f.livre_id)
    else if (f.conte_africain_id) idsParType['conte-africain'].push(f.conte_africain_id)
    else if (f.conte_enfant_id) idsParType['conte-enfant'].push(f.conte_enfant_id)
  }

  const resultats = await Promise.all(
    Object.entries(idsParType).map(([type, ids]) =>
      ids.length > 0
        ? supabase.from(CONFIG_PAR_TYPE[type].table).select('id, titre, slug, couverture_url').in('id', ids)
        : Promise.resolve({ data: [] })
    )
  )

  const items = Object.keys(idsParType).flatMap((type, i) =>
    (resultats[i].data ?? []).map((item) => ({ ...item, type }))
  )
  // Réordonner selon l'ordre des favoris (le plus récent d'abord)
  const ordre = (favoris ?? []).map((f) => f.roman_id || f.livre_id || f.conte_africain_id || f.conte_enfant_id)
  items.sort((a, b) => ordre.indexOf(a.id) - ordre.indexOf(b.id))

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-3">Tes favoris</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        Tout ce que tu as mis de côté pour plus tard.
      </p>

      {items.length === 0 ? (
        <p className="text-papier/30 text-sm font-mono">
          Rien pour l'instant — le bouton "Favori" est sur chaque fiche de lecture.
        </p>
      ) : (
        <ul className="divide-y divide-ligne">
          {items.map((item) => {
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
