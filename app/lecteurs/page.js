import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BoutonSuivre from '@/components/BoutonSuivre'
import { CouvertureGeneree, CouvertureLivre, CouvertureConteAfricain, CouvertureConteEnfant } from '@/components/Couvertures'

function AvatarMonogramme({ pseudo, avatar_url }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt={pseudo} className="w-12 h-12 rounded-full object-cover shrink-0" />
  }
  const initiale = (pseudo || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
      <span className="font-display text-lg text-papier">{initiale}</span>
    </div>
  )
}

const HREF_PAR_TYPE = { roman: '/roman', livre: '/livres', 'conte-africain': '/contes-africains', 'conte-enfant': '/contes-enfants' }
const COUVERTURE_PAR_TYPE = { roman: CouvertureGeneree, livre: CouvertureLivre, 'conte-africain': CouvertureConteAfricain, 'conte-enfant': CouvertureConteEnfant }

function CarteContenu({ item }) {
  const href = `${HREF_PAR_TYPE[item.type]}/${item.slug}`
  const Couverture = COUVERTURE_PAR_TYPE[item.type]
  return (
    <a href={href} className="flex items-center gap-3 py-3 group min-w-0">
      <div className="relative overflow-hidden rounded-md w-11 h-14 shrink-0">
        <Couverture id={item.id} titre={item.titre} couvertureUrl={item.couverture_url} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-papier font-display text-base truncate group-hover:text-or transition-colors">{item.titre}</p>
        {item.genre && <p className="text-papier/35 text-xs font-mono uppercase tracking-wide mt-0.5">{item.genre}</p>}
      </div>
      {typeof item.lecteurs === 'number' && (
        <span className="shrink-0 text-or font-mono text-[0.65rem] border border-or/30 rounded-full px-2.5 py-1">
          {item.lecteurs} lecteur{item.lecteurs !== 1 ? 's' : ''}
        </span>
      )}
    </a>
  )
}

export default async function LecteursPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: romans }, { data: livres }, { data: contesAfricains }, { data: contesEnfants }, { data: profils }] = await Promise.all([
    supabase.from('romans').select('id, titre, slug, genre, couverture_url').eq('statut_visibilite', 'publie'),
    supabase.from('livres').select('id, titre, slug, genre, couverture_url').eq('statut', 'publie'),
    supabase.from('contes_africains').select('id, titre, slug, genre, couverture_url').eq('statut', 'publie'),
    supabase.from('contes_enfants').select('id, titre, slug, genre, couverture_url').eq('statut', 'publie'),
    supabase.from('profiles').select('id, pseudo, avatar_url, bio, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  // Progression et abonnements propres à l'utilisateur (RLS privée, client normal)
  let mesEntames = { roman: new Set(), livre: new Set(), 'conte-africain': new Set(), 'conte-enfant': new Set() }
  let genresLus = new Set()
  let idsSuivis = new Set()
  if (user) {
    const [{ data: progRomans }, { data: progLivres }, { data: progContesAfricains }, { data: progContesEnfants }, { data: suivis }] = await Promise.all([
      supabase.from('lecture_progress').select('roman_id').eq('user_id', user.id),
      supabase.from('lecture_progress_livres').select('livre_id').eq('user_id', user.id),
      supabase.from('lecture_progress_contes_africains').select('conte_id').eq('user_id', user.id),
      supabase.from('lecture_progress_contes_enfants').select('conte_id').eq('user_id', user.id),
      supabase.from('follows').select('suivi_id').eq('follower_id', user.id),
    ])
    mesEntames.roman = new Set((progRomans ?? []).map((p) => p.roman_id))
    mesEntames.livre = new Set((progLivres ?? []).map((p) => p.livre_id))
    mesEntames['conte-africain'] = new Set((progContesAfricains ?? []).map((p) => p.conte_id))
    mesEntames['conte-enfant'] = new Set((progContesEnfants ?? []).map((p) => p.conte_id))
    idsSuivis = new Set((suivis ?? []).map((s) => s.suivi_id))

    const romansParId = Object.fromEntries((romans ?? []).map((r) => [r.id, r]))
    mesEntames.roman.forEach((id) => { if (romansParId[id]?.genre) genresLus.add(romansParId[id].genre) })
  }

  // Lecteurs distincts par titre — agrégat anonymisé nécessitant la clé service_role
  // (chaque table de progression est privée par RLS, chacun ne voit que la sienne).
  const idsRomans = (romans ?? []).map((r) => r.id)
  const idsLivres = (livres ?? []).map((l) => l.id)
  const idsContesAfricains = (contesAfricains ?? []).map((c) => c.id)
  const idsContesEnfants = (contesEnfants ?? []).map((c) => c.id)
  const [{ data: progressionsRomans }, { data: progressionsLivres }, { data: progressionsContesAfricains }, { data: progressionsContesEnfants }] = await Promise.all([
    idsRomans.length > 0 ? admin.from('lecture_progress').select('roman_id, user_id').in('roman_id', idsRomans) : Promise.resolve({ data: [] }),
    idsLivres.length > 0 ? admin.from('lecture_progress_livres').select('livre_id, user_id').in('livre_id', idsLivres) : Promise.resolve({ data: [] }),
    idsContesAfricains.length > 0 ? admin.from('lecture_progress_contes_africains').select('conte_id, user_id').in('conte_id', idsContesAfricains) : Promise.resolve({ data: [] }),
    idsContesEnfants.length > 0 ? admin.from('lecture_progress_contes_enfants').select('conte_id, user_id').in('conte_id', idsContesEnfants) : Promise.resolve({ data: [] }),
  ])

  function compterLecteurs(progressions, colonneId) {
    const parId = {}
    for (const p of progressions ?? []) {
      parId[p[colonneId]] = parId[p[colonneId]] ?? new Set()
      parId[p[colonneId]].add(p.user_id)
    }
    return parId
  }
  const lecteursParRoman = compterLecteurs(progressionsRomans, 'roman_id')
  const lecteursParLivre = compterLecteurs(progressionsLivres, 'livre_id')
  const lecteursParConteAfricain = compterLecteurs(progressionsContesAfricains, 'conte_id')
  const lecteursParConteEnfant = compterLecteurs(progressionsContesEnfants, 'conte_id')

  const contenuComplet = [
    ...(romans ?? []).map((r) => ({ ...r, type: 'roman', lecteurs: lecteursParRoman[r.id]?.size ?? 0 })),
    ...(livres ?? []).map((l) => ({ ...l, type: 'livre', lecteurs: lecteursParLivre[l.id]?.size ?? 0 })),
    ...(contesAfricains ?? []).map((c) => ({ ...c, type: 'conte-africain', lecteurs: lecteursParConteAfricain[c.id]?.size ?? 0 })),
    ...(contesEnfants ?? []).map((c) => ({ ...c, type: 'conte-enfant', lecteurs: lecteursParConteEnfant[c.id]?.size ?? 0 })),
  ]

  // Recommandations personnalisées : mêmes genres déjà lus (romans, pour l'instant seul type
  // avec un historique de genre exploité ici), pas encore commencés, toutes sections confondues
  const recommandations = user
    ? contenuComplet
        .filter((c) => !mesEntames[c.type].has(c.id) && c.genre && genresLus.has(c.genre))
        .sort((a, b) => b.lecteurs - a.lecteurs)
        .slice(0, 4)
    : []

  // Le plus lu par la communauté, toutes catégories confondues
  const plusLus = [...contenuComplet].sort((a, b) => b.lecteurs - a.lecteurs).slice(0, 5)

  const autresLecteurs = (profils ?? []).filter((p) => p.id !== user?.id && !idsSuivis.has(p.id))

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-3">Découvrir</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        De nouvelles lectures, ce que la communauté préfère, d'autres lecteurs à suivre.
      </p>

      {recommandations.length > 0 && (
        <>
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-2">Pour toi</p>
          <p className="text-papier/35 text-xs mb-2">
            Parce que tu lis déjà du {[...genresLus].join(', ')}.
          </p>
          <ul className="divide-y divide-ligne mb-14">
            {recommandations.map((c) => (
              <li key={`${c.type}-${c.id}`}><CarteContenu item={c} /></li>
            ))}
          </ul>
          <div className="filet-or mb-14" />
        </>
      )}

      {plusLus.some((c) => c.lecteurs > 0) && (
        <>
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Le plus lu par la communauté</p>
          <ul className="divide-y divide-ligne mb-14">
            {plusLus.filter((c) => c.lecteurs > 0).map((c) => (
              <li key={`${c.type}-${c.id}`}><CarteContenu item={c} /></li>
            ))}
          </ul>
          <div className="filet-or mb-14" />
        </>
      )}

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Lecteurs à suivre</p>
      <ul className="divide-y divide-ligne">
        {autresLecteurs.map((p) => (
          <li key={p.id} className="py-5 flex items-center justify-between gap-4">
            <a href={`/profil/${p.pseudo}`} className="flex items-center gap-4 min-w-0">
              <AvatarMonogramme pseudo={p.pseudo} avatar_url={p.avatar_url} />
              <div className="min-w-0">
                <p className="text-papier font-display text-lg truncate">{p.pseudo}</p>
                {p.bio && <p className="text-papier/40 text-sm truncate">{p.bio}</p>}
              </div>
            </a>
            <div className="shrink-0">
              <BoutonSuivre profilId={p.id} />
            </div>
          </li>
        ))}
        {autresLecteurs.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-6">
            Tu suis déjà tout le monde ici — reviens bientôt pour de nouveaux lecteurs.
          </p>
        )}
      </ul>
    </div>
  )
}
