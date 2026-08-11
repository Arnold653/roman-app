import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const admin = createAdminClient()
  const { data: livres, error } = await admin.from('livres').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ livres })
}

export async function POST(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const form = await request.formData()

  const titre = form.get('titre')
  const slug = form.get('slug')
  const auteur = form.get('auteur')
  const description = form.get('description')
  const genre = form.get('genre')
  const verifiePar = form.get('verifie_par')
  const generePar = form.get('genere_par_ia') === 'true'
  const fichier = form.get('fichier')

  if (!titre || !slug || !fichier) {
    return NextResponse.json({ error: 'Titre, slug et fichier PDF requis' }, { status: 400 })
  }

  const cheminFichier = `${slug}-${Date.now()}.pdf`
  const bytes = new Uint8Array(await fichier.arrayBuffer())

  const { error: erreurUpload } = await admin.storage.from('livres').upload(cheminFichier, bytes, {
    contentType: 'application/pdf',
  })
  if (erreurUpload) return NextResponse.json({ error: erreurUpload.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('livres').getPublicUrl(cheminFichier)

  const { error: erreurInsert } = await admin.from('livres').insert({
    titre, slug, auteur, description, genre,
    fichier_url: urlPublique.publicUrl,
    genere_par_ia: generePar,
    verifie_par: verifiePar || null,
  })
  if (erreurInsert) return NextResponse.json({ error: erreurInsert.message }, { status: 400 })

  return NextResponse.json({ ok: true, slug })
}

export async function DELETE(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const admin = createAdminClient()
  const { error } = await admin.from('livres').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
