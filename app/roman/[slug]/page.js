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

  // "Roman en Première" : le roman entier est programmé pour une sortie officielle future, avec
  // un prix d'accès anticipé. Avant cette date, seul un lecteur ayant payé (ou l'admin) peut lire
  // quoi que ce soit — sinon on affiche uniquement la fiche du roman + le compte à rebours + le
  // bouton pour débloquer, aucun chapitre n'est chargé.
  const romanEnPremiere = roman.publie_le && new Date(roman.publie_le) > new Date() && roman.prix_fcfa > 0
  let romanDebloque = estAdmin
  if (romanEnPremiere && !estAdmin) {
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

  if (romanEnPremiere && !romanDebloque) {
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
          {new Date(roman.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <BoutonDeblocage romanId={roman.id} prixFcfa={roman.prix_fcfa} publieLe={roman.publie_le} libelle="ce roman en avant-première" />
      </div>
    )
  }

  const admin = createAdminClient()

  let chapitres
  if (romanDebloque && romanEnPremiere) {
    // Accès anticipé payé pour tout le roman : tout ce qui est déjà écrit devient lisible,
    // peu importe la date de sortie individuelle de chaque chapitre.
    const { data } = await admin.from('chapitres').select('*').eq('roman_id', roman.id).order('numero', { ascending: true })
    chapitres = data || []
  } else {
    const { data: chapitresPublies } = await supabase
      .from('chapitres')
      .select('*')
      .eq('roman_id', roman.id)
      .lte('publie_le', new Date().toISOString())
      .order('numero', { ascending: true })

    // Chapitres programmés (pas encore sortis) mais payants pour un accès anticipé (à l'échelle du
    // chapitre, pas du roman). La policy RLS bloque ces lignes pour un lecteur normal (comportement
    // voulu pour les chapitres gratuits à venir), donc on passe par le client admin pour CEUX-LÀ
    // uniquement, et seulement s'ils ont un prix — un chapitre programmé gratuit (prix_fcfa = 0)
    // reste totalement invisible avant sa sortie.
    const { data: chapitresAnticipes } = await admin
      .from('chapitres')
      .select('*')
      .eq('roman_id', roman.id)
      .gt('publie_le', new Date().toISOString())
      .gt('prix_fcfa', 0)
      .order('numero', { ascending: true })

    chapitres = [...(chapitresPublies || []), ...(chapitresAnticipes || [])].sort((a, b) => a.numero - b.numero)
  }

  const premier = chapitres?.[0]

  // Prochaine "Première" : le chapitre programmé le plus proche, pas encore sorti (gratuit ou
  // payant en avant-première). On ne sélectionne que les métadonnées, jamais `contenu`.
  const { data: prochaineParution } = await admin
    .from('chapitres')
    .select('numero, titre, publie_le')
    .eq('roman_id', roman.id)
    .gt('publie_le', new Date().toISOString())
    .order('publie_le', { ascending: true })
    .limit(1)
    .maybeSingle()

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

  const courant = chapitres?.find((c) => c.numero === numeroDemande) || premier
  const index = chapitres?.findIndex((c) => c.id === courant?.id) ?? -1
  const precedent = index > 0 ? chapitres[index - 1] : null
  const suivant = index >= 0 && index < (chapitres?.length ?? 0) - 1 ? chapitres[index + 1] : null

  // Un chapitre n'est verrouillé que s'il est ENCORE programmé (pas encore sorti officiellement)
  // ET payant. Une fois sa date de sortie passée, il est gratuit pour tout le monde — même pour
  // ceux qui n'ont jamais payé — donc pas besoin de vérifier de déblocage à ce moment-là.
  const estEncoreProgramme = courant?.publie_le && new Date(courant.publie_le) > new Date()
  let verrouille = false
  if (estEncoreProgramme && courant?.prix_fcfa > 0 && !estAdmin) {
    const { data: deblocage } = await supabase
      .from('deblocages')
      .select('id')
      .eq('user_id', user.id)
      .eq('chapitre_id', courant.id)
      .eq('statut', 'reussi')
      .maybeSingle()
    verrouille = !deblocage
  }

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
      {roman.statut_visibilite !== 'publie' && (
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-grenat border border-grenat/40 rounded-full px-2.5 py-1 inline-block mb-4">
          Brouillon — visible pour toi seul
        </p>
      )}
      {courant?.numero === chapitres?.[0]?.numero ? (
        <div className="mb-12 lever">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/30 rounded-full px-2.5 py-1">
            {roman.genre}
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-3 leading-tight">{roman.titre}</h1>
          <p className="text-papier/50 leading-relaxed mb-4">{roman.resume}</p>
          <BadgeTransparence generePar={roman.genere_par_ia} verifiePar={roman.verifie_par} />
        </div>
      ) : (
        <div className="mb-10 lever flex items-baseline justify-between gap-4">
          <h1 className="font-display text-2xl text-papier/70">{roman.titre}</h1>
          <a href={`/roman/${roman.slug}?ch=${chapitres?.[0]?.numero}`} className="text-xs font-mono text-papier/30 hover:text-or transition-colors shrink-0">
            Voir le résumé
          </a>
        </div>
      )}

      {chapitres && chapitres.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12">
          {chapitres.map((c) => (
            <a
              key={c.id}
              href={`/roman/${roman.slug}?ch=${c.numero}`}
              className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                c.id === courant?.id ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
              }`}
            >
              Ch. {c.numero}
              {c.publie_le && new Date(c.publie_le) > new Date() && c.prix_fcfa > 0 ? ' 🔒' : ''}
            </a>
          ))}
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
          {verrouille ? (
            <BoutonDeblocage chapitreId={courant.id} prixFcfa={courant.prix_fcfa} publieLe={courant.publie_le} />
          ) : (
            <>
              <div className={courant.titre ? 'mb-8' : 'mb-8 mt-2'}>
                <LectureAudio texte={courant.contenu} titre={courant.titre} />
              </div>
              <CorpsChapitre texte={courant.contenu} />

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
    </div>
  )
}
