import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { chapitre_id } = await request.json()
  const admin = createAdminClient()

  const [{ data: profil }, { data: chapitre }, { data: commentateurs }] = await Promise.all([
    admin.from('profiles').select('pseudo').eq('id', user.id).single(),
    admin.from('chapitres').select('numero, romans(titre, slug)').eq('id', chapitre_id).single(),
    admin.from('commentaires').select('user_id').eq('chapitre_id', chapitre_id).neq('user_id', user.id),
  ])

  const destinataires = [...new Set((commentateurs ?? []).map((c) => c.user_id))]
  if (destinataires.length === 0) return NextResponse.json({ ok: true })

  const notifs = destinataires.map((id) => ({
    user_id: id,
    type: 'nouveau_commentaire',
    contenu: `${profil?.pseudo ?? 'Un lecteur'} a aussi réagi sur « ${chapitre?.romans?.titre ?? ''} », chapitre ${chapitre?.numero ?? ''}.`,
    lien: `/roman/${chapitre?.romans?.slug ?? ''}?ch=${chapitre?.numero ?? ''}`,
  }))

  await admin.from('notifications').insert(notifs)

  return NextResponse.json({ ok: true })
}
