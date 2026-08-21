import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BadgeTransparence from '@/components/BadgeTransparence'
import LecteurConte from '@/components/LecteurConte'
import BoutonDeblocage from '@/components/BoutonDeblocage'
import BoutonPourboire from '@/components/BoutonPourboire'
import CachePourHorsLigne from '@/components/CachePourHorsLigne'
import BarreRetourAdmin from '@/components/BarreRetourAdmin'
import PartagerLecture from '@/components/PartagerLecture'
import SelectionPartage from '@/components/SelectionPartage'
import BoutonFavori from '@/components/BoutonFavori'
import AvisSection from '@/components/AvisSection'
import { enregistrerActiviteLecture } from '@/lib/serieLecture'

export default async function ConteAfricainDetailPage({ params, searchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?suite=/contes-africains/${params.slug}`)
  }

  const { data: conte } = await supabase.from('contes_africains').select('*').eq('slug', params.slug).single()
  const estAdmin = user.email === process.env.ADMIN_EMAIL
  await enregistrerActiviteLecture(createAdminClient(), user.id)

  if (!conte || (conte.statut !== 'publie' && !estAdmin)) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Conte introuvable.</div>
  }

  // Mode 'payant' : le conte entier est verrouillé tant qu'il n'est pas débloqué (l'admin voit toujours tout).
  let verrouille = false
  // Mode 'bonus' : le conte reste gratuit, seul le contenu bonus est verrouillé.
  let bonusDebloque = false

  if (!estAdmin && (conte.mode_monetisation === 'payant' || conte.mode_monetisation === 'bonus')) {
    const { data: deblocage } = await supabase
      .from('deblocages')
      .select('id')
      .eq('user_id', user.id)
      .eq('conte_africain_id', conte.id)
      .eq('statut', 'reussi')
      .eq('type', 'deblocage')
      .maybeSingle()

    if (conte.mode_monetisation === 'payant') verrouille = !deblocage
    if (conte.mode_monetisation === 'bonus') bonusDebloque = !!deblocage
  }
  if (estAdmin && conte.mode_monetisation === 'bonus') bonusDebloque = true

  let sectionInitiale = 0
  if (!verrouille) {
    const { data: progression } = await supabase
      .from('lecture_progress_contes_africains')
      .select('derniere_section')
      .eq('user_id', user.id)
      .eq('conte_id', conte.id)
      .maybeSingle()
    sectionInitiale = progression?.derniere_section || 0
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      {estAdmin && searchParams?.admin && <BarreRetourAdmin href="/admin/contes-africains" />}
      <CachePourHorsLigne />
      {conte.statut !== 'publie' && (
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-grenat border border-grenat/40 rounded-full px-2.5 py-1 inline-block mb-4">
          Brouillon — visible pour toi seul
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {conte.region && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#e69742] border border-[#e69742]/30 rounded-full px-2.5 py-1">
            {conte.region}
          </span>
        )}
        {conte.genre && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/50 border border-ligne rounded-full px-2.5 py-1">
            {conte.genre}
          </span>
        )}
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-2 leading-tight">{conte.titre}</h1>
      {conte.auteur && <p className="text-papier/40 font-mono text-sm mb-4">{conte.auteur}</p>}

      {conte.description && <p className="text-papier/60 leading-relaxed mb-6">{conte.description}</p>}

      <div className="mb-8">
        <BadgeTransparence generePar={conte.genere_par_ia} verifiePar={conte.verifie_par} />
      </div>

      <div className="mb-8 flex items-center gap-4">
        <PartagerLecture type="conte-africain" titre={conte.titre} region={conte.region} slug={conte.slug} couvertureUrl={conte.couverture_url} />
        <BoutonFavori type="conte-africain" id={conte.id} />
      </div>

      {verrouille ? (
        <BoutonDeblocage conteAfricainId={conte.id} prixFcfa={conte.prix_fcfa} />
      ) : (
        <SelectionPartage type="conte-africain" titre={conte.titre} slug={conte.slug} couvertureUrl={conte.couverture_url}>
          <LecteurConte
            url={conte.fichier_url}
            slug={conte.slug}
            contenuId={conte.id}
            contenuInitial={conte.contenu_extrait || null}
            sectionInitiale={sectionInitiale}
            baseApi="/api/contes-africains"
            tableProgression="lecture_progress_contes_africains"
            colonneId="conte_id"
          />
        </SelectionPartage>
      )}

      {!verrouille && conte.mode_monetisation === 'pourboire' && (
        <BoutonPourboire conteAfricainId={conte.id} />
      )}

      {!verrouille && conte.mode_monetisation === 'bonus' && (
        bonusDebloque ? (
          conte.bonus_contenu ? (
            <div className="border border-[#e69742]/30 rounded-2xl p-8 my-10">
              <p className="font-mono text-xs uppercase tracking-widest text-[#e69742] mb-4">Bonus débloqué</p>
              <p className="text-papier/80 leading-relaxed whitespace-pre-wrap">{conte.bonus_contenu}</p>
            </div>
          ) : null
        ) : (
          <BoutonDeblocage conteAfricainId={conte.id} prixFcfa={conte.prix_fcfa} libelle="le contenu bonus" />
        )
      )}

      <AvisSection type="conte-africain" id={conte.id} />
    </div>
  )
}
