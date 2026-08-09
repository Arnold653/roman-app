import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ user: null, isAdmin: false })
  }

  return NextResponse.json({
    user: { email: user.email, pseudo: user.user_metadata?.pseudo || null },
    isAdmin: user.email === process.env.ADMIN_EMAIL,
  })
}
