import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Reçoit une image extraite du PDF (data URL JPEG) pendant la toute première extraction d'un
// livre, la stocke dans le bucket 'livres', et renvoie son URL publique à intégrer dans le
// texte mis en cache. Refuse toute nouvelle image une fois le livre déjà mis en cache (même
// règle que /cache : le premier calcul fait foi, on ne laisse pas un visiteur quelconque
// continuer à remplir le stockage après coup).
// Nécessite une session connectée (pas juste "anonyme d'internet") et plafonne la taille de
// chaque image à 8 Mo, pour éviter l'abus de stockage par quelqu'un qui bombarderait cette
// route directement sans jamais passer par un vrai PDF en cours d'extraction.
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024

export async function POST(request, { params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json()
  if (!body?.dataUrl || !body?.nom) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const admin = createAdminClient()
  const { data: livre } = await admin.from('livres').select('id, contenu_extrait').eq('slug', params.slug).maybeSingle()
  if (!livre) return NextResponse.json({ error: 'Livre introuvable' }, { status: 404 })
  if (livre.contenu_extrait) return NextResponse.json({ error: 'Déjà mis en cache' }, { status: 409 })

  const base64 = body.dataUrl.split(',')[1] || ''
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ error: 'Image trop volumineuse.' }, { status: 413 })
  }
  const chemin = `${params.slug}/images/${body.nom}.jpg`

  const { error } = await admin.storage.from('livres').upload(chemin, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('livres').getPublicUrl(chemin)
  return NextResponse.json({ url: urlPublique.publicUrl })
}
