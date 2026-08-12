import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Sauvegarde le résultat de l'extraction du PDF pour ce livre, une seule fois, afin que les
// lectures suivantes (par n'importe quel visiteur) n'aient plus à re-parser le PDF côté client
// à chaque ouverture. On n'écrase jamais un cache déjà présent : le premier calcul fait foi,
// et on le vide volontairement depuis l'admin si le moteur d'extraction est amélioré plus tard.
export async function POST(request, { params }) {
  const body = await request.json()
  if (!body?.contenu) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })

  const admin = createAdminClient()
  const { data: livre } = await admin.from('livres').select('id, contenu_extrait').eq('slug', params.slug).maybeSingle()
  if (!livre) return NextResponse.json({ error: 'Livre introuvable' }, { status: 404 })
  if (livre.contenu_extrait) return NextResponse.json({ ok: true, deja: true })

  const { error } = await admin
    .from('livres')
    .update({ contenu_extrait: body.contenu, contenu_extrait_le: new Date().toISOString() })
    .eq('id', livre.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
