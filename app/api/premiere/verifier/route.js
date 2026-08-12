import { createAdminClient } from '@/lib/supabase/admin'
import { publierChapitresDus } from '@/lib/premieres'
import { NextResponse } from 'next/server'

// Pas d'auth : n'importe qui peut l'appeler, mais c'est sans risque — elle ne fait rien
// tant que publie_le n'est pas atteint, et un chapitre déjà publié/notifié est ignoré.
// C'est ce qui permet de déclencher la sortie "à l'heure pile" côté client (voir
// CompteAReboursPremiere.js) sans dépendre du cron quotidien de Vercel Hobby.
// Peut aussi être appelée par un ping externe (ex. cron-job.org) toutes les minutes
// si on veut une sortie fiable même sans visiteur connecté au bon moment.
export async function GET() {
  const admin = createAdminClient()
  const resultat = await publierChapitresDus(admin)
  return NextResponse.json({ traites: resultat.traites })
}
