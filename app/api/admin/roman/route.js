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
