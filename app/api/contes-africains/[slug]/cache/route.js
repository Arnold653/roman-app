import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Voir app/api/livres/[slug]/cache/route.js pour le détail du fonctionnement et pourquoi
// l'authentification est nécessaire ici (empêcher l'empoisonnement du cache).
export async function POST(request, { params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json()
  if (!body?.contenu) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })

  const admin = createAdminClient()
  const { data: conte } = await admin.from('contes_africains').select('id, contenu_extrait').eq('slug', params.slug).maybeSingle()
  if (!conte) return NextResponse.json({ error: 'Conte introuvable' }, { status: 404 })
  if (conte.contenu_extrait) return NextResponse.json({ ok: true, deja: true })

  const { error } = await admin
    .from('contes_africains')
    .update({ contenu_extrait: body.contenu, contenu_extrait_le: new Date().toISOString() })
    .eq('id', conte.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
