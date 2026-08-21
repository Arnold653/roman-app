import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BoutonDeblocage from '@/components/BoutonDeblocage'
import CommentSection from '@/components/CommentSection'
import CorpsChapitre from '@/components/CorpsChapitre'
import BoutonLike from '@/components/BoutonLike'
import SuiviLecture from '@/components/SuiviLecture'
import LectureAudio from '@/components/LectureAudio'
import BadgeTransparence from '@/components/BadgeTransparence'
import CompteAReboursPremiere from '@/components/CompteAReboursPremiere'
import CachePourHorsLigne from '@/components/CachePourHorsLigne'
import BarreRetourAdmin from '@/components/BarreRetourAdmin'
import PartagerLecture from '@/components/PartagerLecture'
import SelectionPartage from '@/components/SelectionPartage'
import BoutonFavori from '@/components/BoutonFavori'
import AvisSection from '@/components/AvisSection'
import { enregistrerActiviteLecture } from '@/lib/serieLecture'
import { degradeDe } from '@/lib/couvertures'

export default async function RomanPage({ params, searchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?suite=/roman/${params.slug}`)
  }

  const { data: roman } = await supabase
    .from('romans')
    .select('*')
    .eq('slug', params.slug)
    .single()

  const estAdmin = user.email === process.env.ADMIN_EMAIL

  if (!roman || (roman.statut_visibilite !== 'publie' && !estAdmin)) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Roman introuvable.</div>
  }

  const admin = createAdminClient()
  await enregistrerActiviteLecture(admin, user?.id)

  // Tous les chapitres déjà écrits, publiés ou non — sert à savoir si le 1er chapitre est encore
  // à venir ("Roman en Première") et à calculer le prix de l'accès anticipé groupé.
  const { data: tousChapitres } = await admin
    .from('chapitres')
    .select('id, numero, titre, publie_le, prix_fcfa')
    .eq('roman_id', roman.id)
    .order('numero', { ascending: true })

  const premierChapitre = tousChapitres?.[0]
  const romanEnPremiere = premierChapitre?.publie_le && new Date(premierChapitre.publie_le) > new Date()

  // Le prix de l'accès anticipé au roman entier n'est pas fixé à la main : c'est la moitié du
  // prix cumulé de tous les chapitres déjà écrits — un vrai geste commercial pour le lecteur qui
  // ne veut pas attendre, recalculé automatiquement à chaque nouveau chapitre ajouté.
  const totalPrixChapitres = (tousChapitres || []).reduce((s, c) => s + (c.prix_fcfa || 0), 0)
  const prixAccesAnticipeRoman = Math.round(totalPrixChapitres / 2)

  let romanDebloque = estAdmin
  if (!estAdmin) {
    // Vérifié en permanence (pas seulement pendant la fenêtre "Première") : une fois payé,
    // l'accès à tout ce qui était déjà écrit au moment de l'achat reste acquis pour toujours,
    // même après la sortie officielle du 1er chapitre.
    const { data: deblocageRoman } = await supabase
      .from('deblocages')
      .select('id')
      .eq('user_id', user.id)
      .eq('roman_id', roman.id)
      .eq('statut', 'reussi')
      .eq('type', 'deblocage')
      .maybeSingle()
    romanDebloque = !!deblocageRoman
  }

  if (romanEnPremiere && prixAccesAnticipeRoman > 0 && !romanDebloque) {
    return (
      <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever text-center">
        {roman.genre && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
            {roman.genre}
          </span>
        )}
        <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-4 leading-tight">{roman.titre}</h1>
        {roman.resume && <p className="text-papier/60 leading-relaxed mb-2 text-left">{roman.resume}</p>}
        <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mt-8 mb-2">Sortie officielle</p>
        <p className="text-papier/70 mb-8">
          {new Date(premierChapitre.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <BoutonDeblocage romanId={roman.id} prixFcfa={prixAccesAnticipeRoman} publieLe={premierChapitre.publie_le} libelle="ce roman en avant-première" />
      </div>
    )
  }

  // Chapitres accessibles pour ce lecteur : déjà sortis, ou programmés-mais-payants (le lecteur
  // peut alors voir la fiche du chapitre et payer). Un chapitre programmé gratuit reste invisible
  // avant sa sortie. Si le roman entier a été débloqué en accès anticipé, tout est accessible
  // d'un coup, pour toujours — pas seulement pendant que le roman est encore "en Première".
  const chapitres = romanDebloque
    ? (tousChapitres || [])
    : (tousChapitres || []).filter((c) => new Date(c.publie_le) <= new Date() || c.prix_fcfa > 0)

  // On ne connaît le `contenu` que pour les chapitres qu'on doit vraiment charger : ci-dessus on
  // n'a que les métadonnées. On recharge le contenu complet, mais seulement pour ceux qu'on garde.
  const idsAcharger = chapitres.map((c) => c.id)
  const { data: chapitresComplets } = idsAcharger.length
    ? await admin.from('chapitres').select('*').in('id', idsAcharger).order('numero', { ascending: true })
    : { data: [] }

  const premier = chapitresComplets?.[0]

  // Chapitres déjà débloqués individuellement par ce lecteur (accès anticipé payé chapitre par
  // chapitre) — sert à ne plus afficher le cadenas une fois payé, et à faire avancer la Première
  // suivante au bon chapitre au lieu de re-proposer celui déjà acheté.
  const { data: deblocagesReussis } = await supabase
    .from('deblocages')
    .select('chapitre_id')
    .eq('user_id', user.id)
    .eq('statut', 'reussi')
    .eq('type', 'deblocage')
    .not('chapitre_id', 'is', null)
  const chapitresDebloques = new Set((deblocagesReussis || []).map((d) => d.chapitre_id))

  // Prochaine "Première" à mettre en avant : le premier chapitre encore à venir que CE lecteur n'a
  // pas déjà débloqué (chapitre par chapitre, ou via le roman entier — sinon le compte à rebours
  // restait bloqué sur un chapitre déjà payé/accessible).
  const { data: chapitresFuturs } = await admin
    .from('chapitres')
    .select('id, numero, titre, publie_le')
    .eq('roman_id', roman.id)
    .gt('publie_le', new Date().toISOString())
    .order('publie_le', { ascending: true })
  const prochaineParution = estAdmin
    ? chapitresFuturs?.[0]
    : (chapitresFuturs || []).find((c) => !chapitresDebloques.has(c.id) && !romanDebloque) || null

  let numeroDemande = searchParams?.ch ? Number(searchParams.ch) : null

  if (!numeroDemande) {
    const { data: progression } = await supabase
      .from('lecture_progress')
      .select('dernier_chapitre')
      .eq('user_id', user.id)
      .eq('roman_id', roman.id)
      .maybeSingle()
    numeroDemande = progression?.dernier_chapitre || premier?.numero
  }

  const courant = chapitresComplets?.find((c) => c.numero === numeroDemande) || premier
  const index = chapitresComplets?.findIndex((c) => c.id === courant?.id) ?? -1
  const precedent = index > 0 ? chapitresComplets[index - 1] : null
  const suivant = index >= 0 && index < (chapitresComplets?.length ?? 0) - 1 ? chapitresComplets[index + 1] : null

  // Un chapitre n'est verrouillé que s'il est ENCORE programmé (pas encore sorti officiellement),
  // payant, ET pas déjà débloqué par ce lecteur — individuellement, ou via l'accès anticipé au
  // roman entier. Une fois sa date de sortie passée, il est gratuit pour tout le monde.
  const estEncoreProgramme = courant?.publie_le && new Date(courant.publie_le) > new Date()
  const verrouille = !estAdmin && !romanDebloque && estEncoreProgramme && courant?.prix_fcfa > 0 && !chapitresDebloques.has(courant.id)

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
      {estAdmin && searchParams?.admin && <BarreRetourAdmin href="/admin" />}
      <CachePourHorsLigne />
      {roman.statut_visibilite !== 'publie' && (
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-grenat border border-grenat/40 rounded-full px-2.5 py-1 inline-block mb-4">
          Brouillon — visible pour toi seul
        </p>
      )}
      {courant?.numero === chapitresComplets?.[0]?.numero ? (
        <div className="mb-12 lever">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
            {roman.genre}
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-3 leading-tight">{roman.titre}</h1>
          <p className="text-papier/50 leading-relaxed mb-4">{roman.resume}</p>
          <BadgeTransparence generePar={roman.genere_par_ia} verifiePar={roman.verifie_par} />
          <div className="mt-3">
            <BoutonFavori type="roman" id={roman.id} />
          </div>
        </div>
      ) : (
        <div className="mb-10 lever flex items-baseline justify-between gap-4">
          <h1 className="font-display text-2xl text-papier/70">{roman.titre}</h1>
          <a href={`/roman/${roman.slug}?ch=${chapitresComplets?.[0]?.numero}`} className="text-xs font-mono text-papier/30 hover:text-or transition-colors shrink-0">
            Voir le résumé
          </a>
        </div>
      )}

      {chapitresComplets && chapitresComplets.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12">
          {chapitresComplets.map((c) => {
            const cVerrouille = !estAdmin && !romanDebloque && new Date(c.publie_le) > new Date() && c.prix_fcfa > 0 && !chapitresDebloques.has(c.id)
            return (
              <a
                key={c.id}
                href={`/roman/${roman.slug}?ch=${c.numero}`}
                className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                  c.id === courant?.id ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
                }`}
              >
                Ch. {c.numero}
                {cVerrouille ? ' 🔒' : ''}
              </a>
            )
          })}
        </div>
      )}

      {courant ? (
        <article className="lever">
          {!verrouille && <SuiviLecture romanId={roman.id} numeroChapitre={courant.numero} />}
          <div className="filet-or mb-8" />
          <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-2">
            Chapitre {courant.numero}
          </p>
          {courant.titre && (
            <h2 className="font-display text-3xl text-papier mb-4">{courant.titre}</h2>
          )}
          <div className="mb-6">
            <PartagerLecture
              type="roman"
              titre={roman.titre}
              genre={roman.genre}
              slug={roman.slug}
              couvertureUrl={roman.couverture_url}
              chapitreLabel={`Chapitre ${courant.numero}`}
            />
          </div>
          {verrouille ? (
            <BoutonDeblocage chapitreId={courant.id} prixFcfa={courant.prix_fcfa} publieLe={courant.publie_le} />
          ) : (
            <>
              <div className={courant.titre ? 'mb-8' : 'mb-8 mt-2'}>
                <LectureAudio texte={courant.contenu} titre={courant.titre} />
              </div>
              <SelectionPartage type="roman" titre={roman.titre} slug={roman.slug} couvertureUrl={roman.couverture_url}>
                <CorpsChapitre texte={courant.contenu} />
              </SelectionPartage>

              {courant.citation_fin && (
                <p className="mt-12 font-display italic text-xl text-papier/60 border-l-2 border-or/50 pl-5">
                  {courant.citation_fin}
                </p>
              )}
            </>
          )}

          {!verrouille && (
            <div className="mt-10">
              <BoutonLike chapitreId={courant.id} />
            </div>
          )}

          {(precedent || suivant) && (
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-ligne font-mono text-sm">
              {precedent ? (
                <a href={`/roman/${roman.slug}?ch=${precedent.numero}`} className="text-papier/50 hover:text-or transition-colors">
                  ← Chapitre {precedent.numero}
                </a>
              ) : <span />}
              {suivant ? (
                <a href={`/roman/${roman.slug}?ch=${suivant.numero}`} className="text-papier/50 hover:text-or transition-colors">
                  Chapitre {suivant.numero} →
                </a>
              ) : <span />}
            </div>
          )}

          {!verrouille && <CommentSection chapitreId={courant.id} />}

          {prochaineParution && (
            <CompteAReboursPremiere
              publieLe={prochaineParution.publie_le}
              numero={prochaineParution.numero}
              titre={prochaineParution.titre}
              romanTitre={roman.titre}
              couvertureUrl={roman.couverture_url}
              degrade={degradeDe(roman.id)}
            />
          )}
        </article>
      ) : prochaineParution ? (
        <CompteAReboursPremiere
          publieLe={prochaineParution.publie_le}
          numero={prochaineParution.numero}
          titre={prochaineParution.titre}
          romanTitre={roman.titre}
          couvertureUrl={roman.couverture_url}
          degrade={degradeDe(roman.id)}
        />
      ) : (
        <p className="text-papier/35 font-mono text-sm">Premier chapitre à venir bientôt.</p>
      )}

      <AvisSection type="roman" id={roman.id} />
    </div>
  )
}
