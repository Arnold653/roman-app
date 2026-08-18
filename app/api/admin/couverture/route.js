import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

// section -> nom de table
const TABLES = {
  roman: 'romans',
  livre: 'livres',
  'conte-africain': 'contes_africains',
  'conte-enfant': 'contes_enfants',
}

// Upload d'une vraie image de couverture (dataUrl base64) pour un titre déjà existant,
// dans l'une des 4 sections. Remplace la couverture générée par dégradé sur les pages
// publiques, sans rien changer côté données si aucune image n'est envoyée.
export async function POST(request) {
  if (!(await verifierAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const table = TABLES[body?.section]
  if (!table || !body?.id || !body?.dataUrl) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base64 = body.dataUrl.split(',')[1] || ''
  const bytes = Buffer.from(base64, 'base64')
  const chemin = `${body.section}/${body.id}.jpg`

  const { error: erreurUpload } = await admin.storage
    .from('couvertures')
    .upload(chemin, bytes, { contentType: 'image/jpeg', upsert: true })
  if (erreurUpload) return NextResponse.json({ error: erreurUpload.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('couvertures').getPublicUrl(chemin)
  // Cache-bust : upsert garde le même chemin, donc même URL — on force le rafraîchissement
  // visuel après un remplacement en ajoutant un paramètre basé sur l'heure d'upload.
  const url = `${urlPublique.publicUrl}?v=${Date.now()}`

  const { error: erreurMaj } = await admin.from(table).update({ couverture_url: url }).eq('id', body.id)
  if (erreurMaj) return NextResponse.json({ error: erreurMaj.message }, { status: 400 })

  return NextResponse.json({ url })
}
