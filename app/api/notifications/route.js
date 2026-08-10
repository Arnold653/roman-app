import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [], nonLues: 0 })

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const nonLues = (notifications ?? []).filter((n) => !n.lu).length

  return NextResponse.json({ notifications: notifications ?? [], nonLues })
}

export async function PATCH() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false)

  return NextResponse.json({ ok: true })
}
