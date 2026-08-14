import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RangStories from '@/components/RangStories'
import CompteAReboursPremiere from '@/components/CompteAReboursPremiere'
import LandingPage from '@/components/LandingPage'
import { CouvertureGeneree, CouvertureLivre } from '@/components/Couvertures'
import { degradeDe } from '@/lib/couvertures'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // --- Visiteur non connecté : page marketing dédiée, pas le tableau de bord ---
  if (!user) {
    const admin = createAdminClient()
    const [{ data: romansVitrine }, { data: livresVitrine }, { data: chapitreProche }, { count: nbLecteurs }] = await Promise.all([
      supabase.from('romans').select('id, titre, slug, couverture_url').eq('statut_visibilite', 'publie').order('created_at', { ascending: false }).limit(5),
      supabase.from('livres').select('id, titre, slug').eq('statut', 'publie').order('created_at', { ascending: false }).limit(3),
      // Client admin : la policy RLS masque les chapitres pas encore sortis à un visiteur normal,
      // ce qui cassait ce compte à rebours. On ne sélectionne que des métadonnées, jamais `contenu`.
      admin
        .from('chapitres')
        .select('numero, publie_le, romans!inner(titre, statut_visibilite)')
        .eq('notifie', false)
        .gt('publie_le', new Date().toISOString())
        .eq('romans.statut_visibilite', 'publie')
        .order('publie_le', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    const vitrine = [
      ...(romansVitrine || []).map((r) => ({ ...r, type: 'roman' })),
      ...(livresVitrine || []).map((l) => ({ ...l, type: 'livre' })),
    ].slice(0, 6)

    const prochaineSortie = chapitreProche
      ? {
          roman: chapitreProche.romans?.titre,
          numero: chapitreProche.numero,
          dansMs: new Date(chapitreProche.publie_le).getTime() - Date.now(),
        }
      : null

    return <LandingPage prochaineSortie={prochaineSortie} vitrine={vitrine} nbLecteurs={nbLecteurs || 0} />
  }

  // --- Compte connecté : tableau de bord personnel ---

  // "Reprendre" : mélange romans et livres selon la dernière position de lecture réelle de
  // l'utilisateur, tous types confondus, triés par date — pas une bannière décorative.
  let reprendre = []
  if (user) {
    const [{ data: progRomans }, { data: progLivres }] = await Promise.all([
      supabase.from('lecture_progress').select('dernier_chapitre, updated_at, romans(titre, slug)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
      supabase.from('lecture_progress_livres').select('derniere_section, updated_at, livres(titre, slug, contenu_extrait)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
    ])

    const itemsRomans = (progRomans || [])
      .filter((p) => p.romans)
      .map((p) => ({
        type: 'Roman', titre: p.romans.titre, sousTitre: `Chapitre ${p.dernier_chapitre}`,
        href: `/roman/${p.romans.slug}`, updated_at: p.updated_at,
      }))

    const itemsLivres = (progLivres || [])
      .filter((p) => p.livres)
      .map((p) => {
        const label = p.livres.contenu_extrait?.sections?.[p.derniere_section]?.pilLabel
        return {
          type: 'Livre', titre: p.livres.titre, sousTitre: label || `Section ${p.derniere_section + 1}`,
          href: `/livres/${p.livres.slug}`, updated_at: p.updated_at,
        }
      })

    reprendre = [...itemsRomans, ...itemsLivres]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 4)
  }

  // Un aperçu vivant de la communauté plutôt qu'un simple chiffre — invite à réagir.
  const { data: dernierCommentaire } = await supabase
    .from('commentaires')
    .select('contenu, created_at, profiles(pseudo, avatar_url), chapitres(numero, romans(titre, slug))')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: nbLecteurs } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  const { data: profilUtilisateur } = await supabase.from('profiles').select('pseudo').eq('id', user.id).maybeSingle()
  const pseudoUtilisateur = profilUtilisateur?.pseudo

  // Nouveautés : de quoi découvrir sans dupliquer les pages Romans/Livres, seulement 3 pièces
  // récentes, pour celles et ceux qui n'ont encore rien commencé (ou veulent autre chose).
  const [{ data: romansRecents }, { data: livresRecents }] = await Promise.all([
    supabase.from('romans').select('id, titre, slug, genre, couverture_url').eq('statut_visibilite', 'publie').order('created_at', { ascending: false }).limit(3),
    supabase.from('livres').select('id, titre, slug, genre').eq('statut', 'publie').order('created_at', { ascending: false }).limit(2),
  ])
  const nouveautes = [
    ...(romansRecents || []).map((r) => ({ ...r, type: 'roman' })),
    ...(livresRecents || []).map((l) => ({ ...l, type: 'livre' })),
  ].slice(0, 4)

  const estAdmin = user?.email === process.env.ADMIN_EMAIL

  // Premières à venir, tous romans confondus — la plus proche par roman.
  // L'admin voit aussi les Premières de ses romans encore en brouillon (utile pour tester
  // avant publication) ; le grand public ne voit que celles des romans publiés.
  // Client admin : la policy RLS masque les lignes dont publie_le est dans le futur pour un
  // lecteur normal — sans ça cette section restait invisible pour tout le monde sauf l'admin.
  const admin = createAdminClient()
  let requetePremieres = admin
    .from('chapitres')
    .select('numero, titre, publie_le, roman_id, romans!inner(id, titre, slug, couverture_url, statut_visibilite)')
    .eq('notifie', false)
    .gt('publie_le', new Date().toISOString())
    .order('publie_le', { ascending: true })

  if (!estAdmin) {
    requetePremieres = requetePremieres.eq('romans.statut_visibilite', 'publie')
  }

  const { data: chapitresProgrammes } = await requetePremieres

  const vues = new Set()
  const premieresAVenir = []
  for (const c of chapitresProgrammes || []) {
    if (vues.has(c.roman_id)) continue
    vues.add(c.roman_id)
    premieresAVenir.push(c)
    if (premieresAVenir.length >= 6) break
  }

  const salutation = (() => {
    const heure = new Date().getHours()
    if (heure < 5) return 'Bonne nuit'
    if (heure < 12) return 'Bonjour'
    if (heure < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  return (
    <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
      <RangStories />

      <div className="lever mb-14">
        <h1 className="font-display text-3xl md:text-4xl text-papier">
          {salutation}{pseudoUtilisateur ? `, ${pseudoUtilisateur}` : ''}.
        </h1>
        <p className="text-papier/45 mt-2">
          {reprendre.length > 0
            ? "De quoi lire là où tu t'es arrêté."
            : premieresAVenir.length > 0
            ? 'Une sortie approche — en attendant, de quoi commencer.'
            : 'De quoi commencer aujourd\'hui.'}
        </p>
      </div>

      {premieresAVenir.length > 0 && (
        <div className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-or mb-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-or opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-or" />
            </span>
            Premières à venir
          </p>
          <div className="flex gap-4 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x mandatory' }}>
            {premieresAVenir.map((c) => (
              <CompteAReboursPremiere
                key={c.roman_id}
                compact
                publieLe={c.publie_le}
                numero={c.numero}
                titre={c.titre}
                romanTitre={c.romans?.titre}
                romanSlug={c.romans?.slug}
                couvertureUrl={c.romans?.couverture_url}
                degrade={degradeDe(c.romans?.id || c.roman_id)}
                brouillon={c.romans?.statut_visibilite !== 'publie'}
              />
            ))}
          </div>
        </div>
      )}

      {reprendre.length > 0 ? (
        <div className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-4">Reprendre</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {reprendre.map((r, i) => (
              <a
                key={i}
                href={r.href}
                className="group bg-encreClair border border-ligne rounded-xl p-5 hover:border-or/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-or mb-1.5 block">{r.type}</span>
                  <h3 className="font-display text-lg leading-tight mb-1 text-papier truncate">{r.titre}</h3>
                  <p className="text-papier/40 text-[0.8rem]">{r.sousTitre}</p>
                </div>
                <span className="text-papier/25 group-hover:text-or group-hover:translate-x-0.5 transition-all shrink-0">→</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        nouveautes.length > 0 && (
          <div className="mb-14">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-4">Pour commencer</p>
            <div className="flex gap-4 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x mandatory' }}>
              {nouveautes.map((item) => (
                <a
                  key={`${item.type}-${item.id}`}
                  href={item.type === 'livre' ? `/livres/${item.slug}` : `/roman/${item.slug}`}
                  className="group shrink-0 w-[150px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="relative w-full aspect-[3/4.2] rounded-lg overflow-hidden mb-2.5 border border-ligne group-hover:border-or/40 transition-colors"
                    style={{ background: item.type === 'roman' && !item.couverture_url ? `linear-gradient(150deg, ${degradeDe(item.id)[0]} 0%, ${degradeDe(item.id)[1]} 55%, ${degradeDe(item.id)[2]} 100%)` : undefined }}
                  >
                    {item.type === 'roman' && item.couverture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.couverture_url} alt={item.titre} className="absolute inset-0 w-full h-full object-cover" />
                    ) : item.type === 'roman' ? (
                      <CouvertureGeneree id={item.id} titre={item.titre} />
                    ) : (
                      <CouvertureLivre titre={item.titre} />
                    )}
                  </div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-or/70 mb-0.5">{item.type === 'livre' ? 'Livre' : 'Roman'}</p>
                  <h3 className="font-display text-sm text-papier leading-snug line-clamp-2">{item.titre}</h3>
                </a>
              ))}
            </div>
          </div>
        )
      )}

      {/* Un vrai moment de la communauté plutôt qu'un chiffre — invite à réagir soi-même. */}
      <div className="rounded-xl border border-ligne overflow-hidden">
        {dernierCommentaire && (
          <a href="/fil" className="flex items-start gap-3 px-5 py-4 hover:bg-encreClair/60 transition-colors border-b border-ligne">
            {dernierCommentaire.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dernierCommentaire.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0 mt-0.5">
                <span className="font-display text-xs text-papier">{dernierCommentaire.profiles?.pseudo?.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-papier/85 text-sm leading-snug">
                <span className="text-papier">{dernierCommentaire.profiles?.pseudo}</span>{' '}
                sur {dernierCommentaire.chapitres?.romans?.titre}, ch. {dernierCommentaire.chapitres?.numero}
              </p>
              <p className="text-papier/45 text-sm mt-1 line-clamp-2 italic">« {dernierCommentaire.contenu} »</p>
            </div>
          </a>
        )}
        <div className="grid grid-cols-2 divide-x divide-ligne">
          <a href="/fil" className="flex items-center justify-between px-5 py-3.5 hover:bg-encreClair/60 transition-colors">
            <span className="text-papier/60 text-sm">Le Fil</span>
            <span className="text-papier/25">→</span>
          </a>
          <a href="/communaute" className="flex items-center justify-between px-5 py-3.5 hover:bg-encreClair/60 transition-colors">
            <span className="text-papier/60 text-sm">{nbLecteurs || 0} lecteur{nbLecteurs > 1 ? 's' : ''}</span>
            <span className="text-papier/25">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
