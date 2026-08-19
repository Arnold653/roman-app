import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerPush } from '@/lib/push'
import { decidePublicationOuFile, promouvoirFileAttente } from '@/lib/fileAttenteRomans'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

export async function GET() {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: romans, error } = await admin
    .from('romans')
    .select('*, chapitres(id, numero, titre, contenu, citation_fin, publie_le, prix_fcfa)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  romans.forEach((r) => r.chapitres.sort((a, b) => a.numero - b.numero))

  return NextResponse.json({ romans })
}

export async function PATCH(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  if (body.type === 'nettoyage_titres') {
    // Retire les tirets/deux-points en trop laissés au début des titres de chapitres
    // (résidus d'anciens imports .md avant correction du parseur), et coupe le matériel
    // éditorial (FIN, quatrième de couverture...) qui aurait été collé au dernier chapitre.
    const { data: chapitres } = await admin.from('chapitres').select('id, titre, contenu')
    let corriges = 0
    const regexFinDeMatiere = /^\s*(FIN\s*$|#{1,3}\s.*)/im

    for (const c of chapitres ?? []) {
      const titreNettoye = (c.titre || '').replace(/^[\s:\-–—]+/, '').trim()

      let contenuNettoye = c.contenu || ''
      const matchFin = contenuNettoye.match(regexFinDeMatiere)
      if (matchFin) contenuNettoye = contenuNettoye.slice(0, matchFin.index).trim()

      if (titreNettoye !== c.titre || contenuNettoye !== c.contenu) {
        await admin.from('chapitres').update({ titre: titreNettoye, contenu: contenuNettoye }).eq('id', c.id)
        corriges++
      }
    }
    return NextResponse.json({ ok: true, corriges })
  }

  if (body.type === 'roman_statut') {
    if (body.statut === 'publie') {
      const decision = await decidePublicationOuFile(admin, body.forcer)
      const { error } = await admin
        .from('romans')
        .update({ statut_visibilite: decision.statut_visibilite, statut: decision.statut })
        .eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, enFile: decision.enFile })
    }

    // Dépublication : si le roman occupait une place "en_cours", elle se libère —
    // on promeut aussitôt le prochain roman en file, s'il y en a un.
    const { data: romanAvant } = await admin.from('romans').select('statut').eq('id', body.id).maybeSingle()
    const { error } = await admin
      .from('romans')
      .update({ statut_visibilite: 'brouillon', statut: null })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (romanAvant?.statut === 'en_cours') await promouvoirFileAttente(admin)
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'roman_termine') {
    // Le roman a livré son dernier chapitre : libère sa place dans la file des 5 romans
    // "en_cours" et promeut aussitôt le(s) suivant(s) en file, s'il y en a.
    const { error } = await admin.from('romans').update({ statut: 'termine' }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const promus = await promouvoirFileAttente(admin)
    return NextResponse.json({ ok: true, promus })
  }

  if (body.type === 'replanifier_roman') {
    // Republication avec une nouvelle "Première" complète : réétale les chapitres à partir de
    // `depart` (même logique que repartirChapitres() côté import), remet un prix d'accès
    // anticipé, et réarme `notifie` à false pour que publierChapitresDus() renotifie les lecteurs
    // au moment voulu — sans ça, un chapitre déjà sorti une première fois resterait silencieux.
    const { data: chapitres, error: erreurLecture } = await admin
      .from('chapitres')
      .select('id, numero')
      .eq('roman_id', body.id)
      .order('numero', { ascending: true })
    if (erreurLecture) return NextResponse.json({ error: erreurLecture.message }, { status: 400 })

    const base = new Date(body.depart)
    const intervalleJours = Number(body.intervalleJours) || 0
    const prix = Number(body.prix) || 0

    for (let i = 0; i < (chapitres || []).length; i++) {
      const publieLe = new Date(base.getTime() + i * intervalleJours * 86400000)
      const { error: erreurMaj } = await admin
        .from('chapitres')
        .update({ publie_le: publieLe.toISOString(), prix_fcfa: prix, notifie: false })
        .eq('id', chapitres[i].id)
      if (erreurMaj) return NextResponse.json({ error: erreurMaj.message }, { status: 400 })
    }

    const decision = await decidePublicationOuFile(admin, body.forcer)
    const { error: erreurStatut } = await admin
      .from('romans')
      .update({ statut_visibilite: decision.statut_visibilite, statut: decision.statut })
      .eq('id', body.id)
    if (erreurStatut) return NextResponse.json({ error: erreurStatut.message }, { status: 400 })

    return NextResponse.json({ ok: true, chapitres: chapitres?.length || 0, enFile: decision.enFile })
  }

  if (body.type === 'roman') {
    const { error } = await admin
      .from('romans')
      .update({
        titre: body.titre, resume: body.resume, genre: body.genre,
        genere_par_ia: body.genere_par_ia ?? true, verifie_par: body.verifie_par || null,
        publie_le: body.roman_publie_le || null,
        prix_fcfa: Number(body.roman_prix_fcfa) || 0,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else if (body.type === 'chapitre') {
    const { error } = await admin
      .from('chapitres')
      .update({
        numero: body.numero,
        titre: body.chapitre_titre,
        contenu: body.contenu,
        citation_fin: body.citation_fin,
        publie_le: body.publie_le || new Date().toISOString(),
        prix_fcfa: Number(body.prix_fcfa) || 0,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  const admin = createAdminClient()

  if (type === 'chapitre') {
    const { error } = await admin.from('chapitres').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else if (type === 'roman') {
    const { data: romanAvant } = await admin.from('romans').select('statut').eq('id', id).maybeSingle()

    // On supprime d'abord les chapitres liés, puis le roman
    const { error: errChap } = await admin.from('chapitres').delete().eq('roman_id', id)
    if (errChap) return NextResponse.json({ error: errChap.message }, { status: 400 })

    const { error: errRoman } = await admin.from('romans').delete().eq('id', id)
    if (errRoman) return NextResponse.json({ error: errRoman.message }, { status: 400 })

    if (romanAvant?.statut === 'en_cours') await promouvoirFileAttente(admin)
  } else {
    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  // Cherche si le roman existe déjà (par slug)
  const { data: romanExistant } = await admin
    .from('romans')
    .select('*')
    .eq('slug', body.slug)
    .maybeSingle()

  let roman = romanExistant

  if (!roman) {
    // Nouveau roman : titre, résumé et genre sont requis
    const { data: nouveauRoman, error: creationError } = await admin
      .from('romans')
      .insert({
        titre: body.titre,
        slug: body.slug,
        resume: body.resume,
        genre: body.genre,
        niveau_theme: body.niveau_theme || 1,
        genere_par_ia: body.genere_par_ia ?? true,
        verifie_par: body.verifie_par || null,
        statut: null, // hors file d'attente tant qu'il n'a pas été publié explicitement
      })
      .select()
      .single()

    if (creationError) {
      return NextResponse.json({ error: creationError.message }, { status: 400 })
    }
    roman = nouveauRoman
  } else if (body.titre || body.resume || body.genre) {
    // Roman existant : on ne met à jour que les champs explicitement fournis
    const misAJour = {}
    if (body.titre) misAJour.titre = body.titre
    if (body.resume) misAJour.resume = body.resume
    if (body.genre) misAJour.genre = body.genre

    const { data: romanMaj, error: majError } = await admin
      .from('romans')
      .update(misAJour)
      .eq('id', roman.id)
      .select()
      .single()

    if (majError) {
      return NextResponse.json({ error: majError.message }, { status: 400 })
    }
    roman = romanMaj
  }

  const publieLe = body.publie_le ? new Date(body.publie_le) : new Date()
  const estImmediat = publieLe <= new Date()

  const { error: chapitreError } = await admin.from('chapitres').insert({
    roman_id: roman.id,
    numero: body.numero,
    titre: body.chapitre_titre,
    contenu: body.contenu,
    citation_fin: body.citation_fin,
    publie_le: publieLe.toISOString(),
    notifie: estImmediat, // si programmé, la tâche planifiée notifiera au bon moment
    prix_fcfa: Number(body.prix_fcfa) || 0,
  })

  if (chapitreError) {
    return NextResponse.json({ error: chapitreError.message }, { status: 400 })
  }

  // Notifie immédiatement seulement si le chapitre est publié tout de suite (pas programmé)
  if (romanExistant && estImmediat) {
    const { data: lecteurs } = await admin
      .from('lecture_progress')
      .select('user_id')
      .eq('roman_id', roman.id)

    if (lecteurs && lecteurs.length > 0) {
      const notifs = lecteurs.map((l) => ({
        user_id: l.user_id,
        type: 'nouveau_chapitre',
        contenu: `Nouveau chapitre disponible pour « ${roman.titre} ».`,
        lien: `/roman/${roman.slug}?ch=${body.numero}`,
      }))
      await admin.from('notifications').insert(notifs)
      await Promise.all(
        lecteurs.map((l) =>
          envoyerPush(l.user_id, roman.titre, `Nouveau chapitre disponible.`, `/roman/${roman.slug}?ch=${body.numero}`)
        )
      )
    }
  }

  return NextResponse.json({ ok: true, slug: roman.slug })
}
