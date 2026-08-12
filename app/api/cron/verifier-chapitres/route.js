import { createAdminClient } from '@/lib/supabase/admin'
import { publierChapitresDus } from '@/lib/premieres'
import { NextResponse } from 'next/server'

// Appelé une fois par jour par Vercel Cron (voir vercel.json — le plan Hobby ne permet
// pas une fréquence plus fine). Sert de filet de sécurité : le déclenchement "à l'heure pile"
// se fait normalement via /api/premiere/verifier, appelée par le compte à rebours côté client
// quand il arrive à zéro (voir CompteAReboursPremiere.js).
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resultat = await publierChapitresDus(admin)

  return NextResponse.json({ traites: resultat.traites })
}
