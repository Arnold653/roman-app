import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  // Crée le roman s'il n'existe pas déjà (basé sur le slug), sinon récupère son id
  const { data: roman, error: romanError } = await admin
    .from('romans')
    .upsert(
      {
        titre: body.titre,
        slug: body.slug,
        resume: body.resume,
        genre: body.genre,
        niveau_theme: body.niveau_theme || 1,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (romanError) {
    return NextResponse.json({ error: romanError.message }, { status: 400 })
  }

  const { error: chapitreError } = await admin.from('chapitres').insert({
    roman_id: roman.id,
    numero: body.numero,
    titre: body.chapitre_titre,
    contenu: body.contenu,
    citation_fin: body.citation_fin,
  })

  if (chapitreError) {
    return NextResponse.json({ error: chapitreError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, slug: roman.slug })
}
