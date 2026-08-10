import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ user: null, isAdmin: false })
  }

  const { data: profil } = await supabase.from('profiles').select('pseudo, avatar_url').eq('id', user.id).single()

  return NextResponse.json({
    user: { email: user.email, pseudo: profil?.pseudo || null, avatar_url: profil?.avatar_url || null },
    isAdmin: user.email === process.env.ADMIN_EMAIL,
  })
}
