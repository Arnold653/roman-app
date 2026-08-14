import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Crée un déblocage "en_attente" pour un chapitre ou un livre payant, et renvoie tout ce dont
// le widget KKiaPay a besoin côté client. Le montant vient de la base (jamais du client), donc
// impossible de payer moins que le prix réel en trafiquant la requête.
export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { chapitreId, livreId } = await request.json()

  if (!chapitreId && !livreId) {
    return NextResponse.json({ error: 'chapitreId ou livreId requis' }, { status: 400 })
  }
  if (chapitreId && livreId) {
    return NextResponse.json({ error: 'Un seul de chapitreId / livreId à la fois' }, { status: 400 })
  }

  const admin = createAdminClient()
  const table = chapitreId ? 'chapitres' : 'livres'
  const id = chapitreId || livreId

  const { data: cible } = await admin.from(table).select('id, prix_fcfa').eq('id', id).single()

  if (!cible) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }
  if (!cible.prix_fcfa || cible.prix_fcfa <= 0) {
    return NextResponse.json({ error: "Ce contenu n'est pas payant" }, { status: 400 })
  }

  // Déjà débloqué ? On ne recrée pas de paiement.
  const { data: dejaDebloque } = await admin
    .from('deblocages')
    .select('id')
    .eq('user_id', user.id)
    .eq(chapitreId ? 'chapitre_id' : 'livre_id', id)
    .eq('statut', 'reussi')
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
