import { createAdminClient } from '@/lib/supabase/admin'

function fcfa(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

async function compterLecteurs(admin, table, colonne) {
  const { data } = await admin.from(table).select(colonne)
  return new Set((data ?? []).map((r) => r[colonne])).size
}

export default async function StatsAdminPage() {
  const admin = createAdminClient()

  const septJours = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const trenteJours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: totalLecteurs }, { data: deblocagesReussis }, { count: nbRomansPublies }, { count: nbLivresPublies }, { count: nbContesAfricainsPublies }, { count: nbContesEnfantsPublies }] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('deblocages').select('montant_fcfa, type, created_at').eq('statut', 'reussi'),
    admin.from('romans').select('*', { count: 'exact', head: true }).eq('statut_visibilite', 'publie'),
    admin.from('livres').select('*', { count: 'exact', head: true }).eq('statut', 'publie'),
    admin.from('contes_africains').select('*', { count: 'exact', head: true }).eq('statut', 'publie'),
    admin.from('contes_enfants').select('*', { count: 'exact', head: true }).eq('statut', 'publie'),
  ])

  const revenuTotal = (deblocagesReussis ?? []).reduce((s, d) => s + d.montant_fcfa, 0)
  const revenu30j = (deblocagesReussis ?? []).filter((d) => d.created_at >= trenteJours).reduce((s, d) => s + d.montant_fcfa, 0)
  const nbPourboires = (deblocagesReussis ?? []).filter((d) => d.type === 'pourboire').length
  const nbDeblocages = (deblocagesReussis ?? []).filter((d) => d.type === 'deblocage').length

  const [lecteursActifs7j, lecteursActifsRomans, lecteursActifsLivres, lecteursActifsCA, lecteursActifsCE] = await Promise.all([
    admin.from('activite_lecture').select('user_id').gte('jour', septJours.slice(0, 10)),
    compterLecteurs(admin, 'lecture_progress', 'roman_id'),
    compterLecteurs(admin, 'lecture_progress_livres', 'livre_id'),
    compterLecteurs(admin, 'lecture_progress_contes_africains', 'conte_id'),
    compterLecteurs(admin, 'lecture_progress_contes_enfants', 'conte_id'),
  ])
  const actifs7j = new Set((lecteursActifs7j.data ?? []).map((a) => a.user_id)).size

  // Titres les plus lus, toutes sections confondues (nb de lecteurs distincts par titre)
  async function topTitres(table, colonne, titreTable) {
    const { data } = await admin.from(table).select(`${colonne}, user_id`)
    const parId = {}
    for (const r of data ?? []) {
      parId[r[colonne]] = parId[r[colonne]] ?? new Set()
      parId[r[colonne]].add(r.user_id)
    }
    const ids = Object.keys(parId)
    if (ids.length === 0) return []
    const { data: titres } = await admin.from(titreTable).select('id, titre').in('id', ids)
    return (titres ?? []).map((t) => ({ titre: t.titre, lecteurs: parId[t.id].size })).sort((a, b) => b.lecteurs - a.lecteurs)
  }

  const [topRomans, topLivres, topCA, topCE] = await Promise.all([
    topTitres('lecture_progress', 'roman_id', 'romans'),
    topTitres('lecture_progress_livres', 'livre_id', 'livres'),
    topTitres('lecture_progress_contes_africains', 'conte_id', 'contes_africains'),
    topTitres('lecture_progress_contes_enfants', 'conte_id', 'contes_enfants'),
  ])
  const top5 = [...topRomans, ...topLivres, ...topCA, ...topCE].sort((a, b) => b.lecteurs - a.lecteurs).slice(0, 5)

  const Carte = ({ label, valeur }) => (
    <div className="bg-encreClair rounded-lg px-4 py-4">
      <p className="text-papier/40 text-xs font-mono uppercase tracking-wide mb-1">{label}</p>
      <p className="text-papier font-display text-2xl">{valeur}</p>
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
      <h1 className="font-display text-4xl text-papier mb-10">Statistiques</h1>

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Revenus</p>
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Carte label="Total (tout temps)" valeur={fcfa(revenuTotal)} />
        <Carte label="30 derniers jours" valeur={fcfa(revenu30j)} />
        <Carte label="Déblocages réussis" valeur={nbDeblocages} />
        <Carte label="Pourboires" valeur={nbPourboires} />
      </div>

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Lecteurs</p>
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Carte label="Comptes créés" valeur={totalLecteurs ?? 0} />
        <Carte label="Actifs (7 derniers jours)" valeur={actifs7j} />
        <Carte label="Ont commencé un roman" valeur={lecteursActifsRomans} />
        <Carte label="Ont commencé un livre" valeur={lecteursActifsLivres} />
        <Carte label="Ont lu un conte africain" valeur={lecteursActifsCA} />
        <Carte label="Ont lu un conte enfant" valeur={lecteursActifsCE} />
      </div>

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Catalogue publié</p>
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Carte label="Romans" valeur={nbRomansPublies ?? 0} />
        <Carte label="Livres" valeur={nbLivresPublies ?? 0} />
        <Carte label="Contes africains" valeur={nbContesAfricainsPublies ?? 0} />
        <Carte label="Contes enfants" valeur={nbContesEnfantsPublies ?? 0} />
      </div>

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Les plus lus</p>
      <ul className="divide-y divide-ligne">
        {top5.map((t, i) => (
          <li key={i} className="flex items-center justify-between py-3">
            <span className="text-papier/80 truncate">{t.titre}</span>
            <span className="text-or font-mono text-xs shrink-0 ml-3">{t.lecteurs} lecteur{t.lecteurs !== 1 ? 's' : ''}</span>
          </li>
        ))}
        {top5.length === 0 && <p className="text-papier/30 text-sm font-mono py-4">Pas encore de lecture enregistrée.</p>}
      </ul>
    </div>
  )
}
