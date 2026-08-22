import { createClient } from '@/lib/supabase/server'
import { envoyerEmailBienvenue } from '@/lib/email'
import { NextResponse } from 'next/server'

// Appelée côté client juste après un signUp() réussi (voir app/login/page.js). Ne fait aucune
// vérification métier au-delà de la session : c'est un email de confort, pas une action
// sensible — si elle échoue ou n'est pas appelée, rien de cassé côté compte.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ ok: false })

  const { data: profil } = await supabase.from('profiles').select('pseudo').eq('id', user.id).maybeSingle()
  await envoyerEmailBienvenue({ to: user.email, pseudo: profil?.pseudo || 'là' })

  return NextResponse.json({ ok: true })
}
