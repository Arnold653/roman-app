import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

// Pendant du /api/contes-africains/[slug]/image public, mais côté admin : pas de restriction
// puisque c'est l'admin qui déclenche l'extraction, une seule fois, avant même que le conte
// existe en base (on utilise le slug prévu comme chemin de stockage).
export async function POST(request) {
  if (!(await verifierAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  if (!body?.dataUrl || !body?.nom || !body?.slug) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base64 = body.dataUrl.split(',')[1] || ''
  const bytes = Buffer.from(base64, 'base64')
  const chemin = `${body.slug}/images/${body.nom}.jpg`

  const { error } = await admin.storage.from('contes-africains').upload(chemin, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('contes-africains').getPublicUrl(chemin)
  return NextResponse.json({ url: urlPublique.publicUrl })
}
