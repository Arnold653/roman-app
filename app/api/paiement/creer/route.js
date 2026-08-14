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

  const { chapitreId, livreId, pourboire, montant } = await request.json()

  if (!chapitreId && !livreId) {
    return NextResponse.json({ error: 'chapitreId ou livreId requis' }, { status: 400 })
  }
  if (chapitreId && livreId) {
    return NextResponse.json({ error: 'Un seul de chapitreId / livreId à la fois' }, { status: 400 })
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

  const table = chapitreId ? 'chapitres' : 'livres'
  const id = chapitreId || livreId

  const { data: cible } = await admin.from(table).select('id, prix_fcfa, mode_monetisation').eq('id', id).single()

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
  const { data: dejaDebloque } = await admin
    .from('deblocages')
    .select('id')
    .eq('user_id', user.id)
    .eq(chapitreId ? 'chapitre_id' : 'livre_id', id)
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
