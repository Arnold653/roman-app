import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { suivi_id } = await request.json()
  if (suivi_id === user.id) {
    return NextResponse.json({ error: 'Impossible de te suivre toi-même' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.from('follows').insert({ follower_id: user.id, suivi_id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profilSuiveur } = await admin.from('profiles').select('pseudo').eq('id', user.id).single()

  await admin.from('notifications').insert({
    user_id: suivi_id,
    type: 'nouveau_follower',
    contenu: `${profilSuiveur?.pseudo ?? 'Un lecteur'} a commencé à te suivre.`,
    lien: `/profil/${profilSuiveur?.pseudo ?? ''}`,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const suivi_id = searchParams.get('suivi_id')

  const admin = createAdminClient()
  const { error } = await admin.from('follows').delete().eq('follower_id', user.id).eq('suivi_id', suivi_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
