import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifierTransaction } from '@/lib/kkiapay'
import { NextResponse } from 'next/server'

// Appelée côté client juste après addSuccessListener du widget KKiaPay, pour débloquer
// immédiatement sans attendre le webhook (qui reste le filet de sécurité en cas de fermeture
// du navigateur avant que ce callback ne parte). On ne fait JAMAIS confiance à ce que le client
// affirme : on revérifie la transaction directement auprès de KKiaPay avant de marquer "reussi".
export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { deblocageId, transactionId } = await request.json()
  if (!deblocageId || !transactionId) {
    return NextResponse.json({ error: 'deblocageId et transactionId requis' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: deblocage } = await admin
    .from('deblocages')
    .select('id, user_id, montant_fcfa, statut')
    .eq('id', deblocageId)
    .single()

  if (!deblocage || deblocage.user_id !== user.id) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  if (deblocage.statut === 'reussi') {
    return NextResponse.json({ ok: true, dejaTraite: true })
  }

  let verification
  try {
    verification = await verifierTransaction(transactionId)
  } catch (e) {
    return NextResponse.json({ error: 'Vérification KKiaPay indisponible' }, { status: 502 })
  }

  if (!verification.reussi || verification.montant !== deblocage.montant_fcfa) {
    await admin.from('deblocages').update({ statut: 'echoue', transaction_id: transactionId }).eq('id', deblocageId).eq('statut', 'en_attente')
    return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 402 })
  }

  const { error } = await admin
    .from('deblocages')
    .update({ statut: 'reussi', transaction_id: transactionId })
    .eq('id', deblocageId)
    .eq('statut', 'en_attente')

  if (error) {
    // Conflit probable : transaction_id déjà utilisée ailleurs (unique index), ou déjà traité par le webhook.
    return NextResponse.json({ ok: true, dejaTraite: true })
  }

  return NextResponse.json({ ok: true })
}
