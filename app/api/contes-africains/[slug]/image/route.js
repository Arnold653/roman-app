import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const body = await request.json()
  if (!body?.dataUrl || !body?.nom) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base64 = body.dataUrl.split(',')[1] || ''
  const bytes = Buffer.from(base64, 'base64')
  const chemin = `${params.slug}/images/${body.nom}.jpg`

  const { error } = await admin.storage.from('contes-africains').upload(chemin, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('contes-africains').getPublicUrl(chemin)
  return NextResponse.json({ url: urlPublique.publicUrl })
}
