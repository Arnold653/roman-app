import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Webhook appelé par KKiaPay (à configurer dans Tableau de bord → Webhook avec cette URL).
// C'est le filet de sécurité : si le lecteur ferme son navigateur juste après avoir payé,
// avant que /api/paiement/confirmer n'ait pu partir, c'est ce webhook qui débloque quand même.
// On identifie le déblocage via `partnerId`, qu'on aura passé à openKkiapayWidget côté client
// (voir components/BoutonDeblocage.js) — c'est l'id de la ligne `deblocages`.
export async function POST(request) {
  const secretRecu = request.headers.get('x-kkiapay-secret')
  if (!process.env.KKIAPAY_WEBHOOK_SECRET || secretRecu !== process.env.KKIAPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { transactionId, isPaymentSucces, amount, partnerId } = body || {}

  if (!partnerId) {
    // Rien à rapprocher — on répond 200 quand même pour éviter que KKiaPay ne réessaie en boucle.
    return NextResponse.json({ ok: true, ignore: true })
  }

  const admin = createAdminClient()

  const { data: deblocage } = await admin
    .from('deblocages')
    .select('id, montant_fcfa, statut')
    .eq('id', partnerId)
    .maybeSingle()

  if (!deblocage || deblocage.statut !== 'en_attente') {
    return NextResponse.json({ ok: true, ignore: true })
  }

  const paiementValide = isPaymentSucces === true && Number(amount) === deblocage.montant_fcfa

  await admin
    .from('deblocages')
    .update({ statut: paiementValide ? 'reussi' : 'echoue', transaction_id: transactionId })
    .eq('id', partnerId)
    .eq('statut', 'en_attente')

  return NextResponse.json({ ok: true })
}
