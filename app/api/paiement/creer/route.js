import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Crée un déblocage "en_attente" pour un chapitre payant, un livre payant, un bonus de livre,
// ou un pourboire libre — et renvoie tout ce dont le widget KKiaPay a besoin côté client.
export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { chapitreId, livreId, romanId, pourboire, montant } = await request.json()

  const nbCibles = [chapitreId, livreId, romanId].filter(Boolean).length
  if (nbCibles !== 1) {
    return NextResponse.json({ error: 'Un seul de chapitreId / livreId / romanId à la fois' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Pourboire libre : montant choisi par le lecteur, ne débloque rien, ne vérifie aucun prix en base.
  if (pourboire) {
    if (!livreId) {
      return NextResponse.json({ error: "Le pourboire est réservé aux livres" }, { status: 400 })
    }
    const montantValide = Number.isInteger(montant) && montant >= 100 && montant <= 1000000
    if (!montantValide) {
      return NextResponse.json({ error: 'Montant invalide (minimum 100 FCFA)' }, { status: 400 })
    }
    const { data: livre } = await admin.from('livres').select('id, mode_monetisation').eq('id', livreId).single()
    if (!livre || livre.mode_monetisation !== 'pourboire') {
      return NextResponse.json({ error: "Ce livre n'accepte pas les pourboires" }, { status: 400 })
    }

    const { data: deblocage, error } = await admin
      .from('deblocages')
      .insert({ user_id: user.id, livre_id: livreId, montant_fcfa: montant, statut: 'en_attente', type: 'pourboire' })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: 'Erreur création du paiement' }, { status: 500 })

    return NextResponse.json({
      deblocageId: deblocage.id,
      montant,
      publicKey: process.env.KKIAPAY_PUBLIC_KEY,
      sandbox: process.env.KKIAPAY_SANDBOX === 'true',
    })
  }

  // Le prix de l'accès anticipé à un roman ENTIER n'est pas une colonne fixe : c'est la moitié
  // du prix cumulé de tous ses chapitres déjà écrits, recalculée ici pour ne jamais faire confiance
  // à un montant que le client aurait pu suggérer.
  if (romanId) {
    const { data: chapitresDuRoman } = await admin.from('chapitres').select('prix_fcfa').eq('roman_id', romanId)
    const total = (chapitresDuRoman || []).reduce((s, c) => s + (c.prix_fcfa || 0), 0)
    const prixRoman = Math.round(total / 2)

    if (prixRoman <= 0) {
      return NextResponse.json({ error: "Ce roman n'a pas d'accès anticipé payant" }, { status: 400 })
    }

    const { data: dejaDebloqueRoman } = await admin
      .from('deblocages')
      .select('id')
      .eq('user_id', user.id)
      .eq('roman_id', romanId)
      .eq('statut', 'reussi')
      .eq('type', 'deblocage')
      .maybeSingle()

    if (dejaDebloqueRoman) {
      return NextResponse.json({ error: 'Déjà débloqué' }, { status: 409 })
    }

    const { data: deblocageRoman, error: erreurRoman } = await admin
      .from('deblocages')
      .insert({ user_id: user.id, roman_id: romanId, montant_fcfa: prixRoman, statut: 'en_attente', type: 'deblocage' })
      .select('id')
      .single()

    if (erreurRoman) return NextResponse.json({ error: 'Erreur création du paiement' }, { status: 500 })

    return NextResponse.json({
      deblocageId: deblocageRoman.id,
      montant: prixRoman,
      publicKey: process.env.KKIAPAY_PUBLIC_KEY,
      sandbox: process.env.KKIAPAY_SANDBOX === 'true',
    })
  }

  const table = chapitreId ? 'chapitres' : 'livres'
  const id = chapitreId || livreId

  const colonnes = livreId ? 'id, prix_fcfa, mode_monetisation' : 'id, prix_fcfa'
  const { data: cible } = await admin.from(table).select(colonnes).eq('id', id).single()

  if (!cible) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }
  if (livreId && !['payant', 'bonus'].includes(cible.mode_monetisation)) {
    return NextResponse.json({ error: "Ce livre n'est pas payant" }, { status: 400 })
  }
  if (!cible.prix_fcfa || cible.prix_fcfa <= 0) {
    return NextResponse.json({ error: "Ce contenu n'est pas payant" }, { status: 400 })
  }

  // Déjà débloqué ? On ne recrée pas de paiement (uniquement pour un vrai déblocage, pas un pourboire).
  const champCible = chapitreId ? 'chapitre_id' : 'livre_id'
  const { data: dejaDebloque } = await admin
    .from('deblocages')
    .select('id')
    .eq('user_id', user.id)
    .eq(champCible, id)
    .eq('statut', 'reussi')
    .eq('type', 'deblocage')
    .maybeSingle()

  if (dejaDebloque) {
    return NextResponse.json({ error: 'Déjà débloqué' }, { status: 409 })
  }

  const { data: deblocage, error } = await admin
    .from('deblocages')
    .insert({
      user_id: user.id,
      chapitre_id: chapitreId || null,
      livre_id: livreId || null,
      montant_fcfa: cible.prix_fcfa,
      statut: 'en_attente',
      type: 'deblocage',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erreur création du paiement' }, { status: 500 })
  }

  return NextResponse.json({
    deblocageId: deblocage.id,
    montant: cible.prix_fcfa,
    publicKey: process.env.KKIAPAY_PUBLIC_KEY,
    sandbox: process.env.KKIAPAY_SANDBOX === 'true',
  })
}
