import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

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

  const { error } = await admin.storage.from('contes-enfants').upload(chemin, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('contes-enfants').getPublicUrl(chemin)
  return NextResponse.json({ url: urlPublique.publicUrl })
}
