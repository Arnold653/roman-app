import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BadgeTransparence from '@/components/BadgeTransparence'
import LecteurPDF from '@/components/LecteurPDF'
import BoutonDeblocage from '@/components/BoutonDeblocage'
import BoutonPourboire from '@/components/BoutonPourboire'
import CachePourHorsLigne from '@/components/CachePourHorsLigne'
import BarreRetourAdmin from '@/components/BarreRetourAdmin'

export default async function LivreDetailPage({ params, searchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?suite=/livres/${params.slug}`)
  }

  const { data: livre } = await supabase.from('livres').select('*').eq('slug', params.slug).single()
  const estAdmin = user.email === process.env.ADMIN_EMAIL

  if (!livre || (livre.statut !== 'publie' && !estAdmin)) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Livre introuvable.</div>
  }

  // Mode 'payant' : le livre entier est verrouillé tant qu'il n'est pas débloqué (l'admin voit toujours tout).
  let verrouille = false
  // Mode 'bonus' : le livre reste gratuit, seul le contenu bonus est verrouillé.
  let bonusDebloque = false

  if (!estAdmin && (livre.mode_monetisation === 'payant' || livre.mode_monetisation === 'bonus')) {
    const { data: deblocage } = await supabase
      .from('deblocages')
      .select('id')
      .eq('user_id', user.id)
      .eq('livre_id', livre.id)
      .eq('statut', 'reussi')
      .eq('type', 'deblocage')
      .maybeSingle()

    if (livre.mode_monetisation === 'payant') verrouille = !deblocage
    if (livre.mode_monetisation === 'bonus') bonusDebloque = !!deblocage
  }
  if (estAdmin && livre.mode_monetisation === 'bonus') bonusDebloque = true

  let sectionInitiale = 0
  if (!verrouille) {
    const { data: progression } = await supabase
      .from('lecture_progress_livres')
      .select('derniere_section')
      .eq('user_id', user.id)
      .eq('livre_id', livre.id)
      .maybeSingle()
    sectionInitiale = progression?.derniere_section || 0
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      {estAdmin && searchParams?.admin && <BarreRetourAdmin href="/admin/livres" />}
      <CachePourHorsLigne />
      {livre.statut !== 'publie' && (
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-grenat border border-grenat/40 rounded-full px-2.5 py-1 inline-block mb-4">
          Brouillon — visible pour toi seul
        </p>
      )}
      {livre.genre && (
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
          {livre.genre}
        </span>
      )}
      <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-2 leading-tight">{livre.titre}</h1>
      {livre.auteur && <p className="text-papier/40 font-mono text-sm mb-4">{livre.auteur}</p>}

      {livre.description && <p className="text-papier/60 leading-relaxed mb-6">{livre.description}</p>}

      <div className="mb-8">
        <BadgeTransparence generePar={livre.genere_par_ia} verifiePar={livre.verifie_par} />
      </div>

      {verrouille ? (
        <BoutonDeblocage livreId={livre.id} prixFcfa={livre.prix_fcfa} />
      ) : (
        <LecteurPDF
          url={livre.fichier_url}
          slug={livre.slug}
          livreId={livre.id}
          contenuInitial={livre.contenu_extrait || null}
          sectionInitiale={sectionInitiale}
        />
      )}

      {!verrouille && livre.mode_monetisation === 'pourboire' && (
        <BoutonPourboire livreId={livre.id} />
      )}

      {!verrouille && livre.mode_monetisation === 'bonus' && (
        bonusDebloque ? (
          livre.bonus_contenu ? (
            <div className="border border-or/30 rounded-2xl p-8 my-10">
              <p className="font-mono text-xs uppercase tracking-widest text-or mb-4">Bonus débloqué</p>
              <p className="text-papier/80 leading-relaxed whitespace-pre-wrap">{livre.bonus_contenu}</p>
            </div>
          ) : null
        ) : (
          <BoutonDeblocage livreId={livre.id} prixFcfa={livre.prix_fcfa} libelle="le contenu bonus" />
        )
      )}
    </div>
  )
}
