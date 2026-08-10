import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerPush } from '@/lib/push'
import { NextResponse } from 'next/server'

// Appelé périodiquement par Vercel Cron (voir vercel.json).
// Repère les chapitres dont l'heure de publication programmée vient de passer
// et qui n'ont pas encore déclenché de notification.
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: chapitresAPublier } = await admin
    .from('chapitres')
    .select('id, numero, roman_id, romans(titre, slug)')
    .eq('notifie', false)
    .lte('publie_le', new Date().toISOString())

  if (!chapitresAPublier || chapitresAPublier.length === 0) {
    return NextResponse.json({ traites: 0 })
  }

  for (const chapitre of chapitresAPublier) {
    const { data: lecteurs } = await admin
      .from('lecture_progress')
      .select('user_id')
      .eq('roman_id', chapitre.roman_id)

    if (lecteurs && lecteurs.length > 0) {
      const notifs = lecteurs.map((l) => ({
        user_id: l.user_id,
        type: 'nouveau_chapitre',
        contenu: `Nouveau chapitre disponible pour « ${chapitre.romans?.titre} ».`,
        lien: `/roman/${chapitre.romans?.slug}?ch=${chapitre.numero}`,
      }))
      await admin.from('notifications').insert(notifs)
      await Promise.all(
        lecteurs.map((l) =>
          envoyerPush(
            l.user_id,
            chapitre.romans?.titre,
            'Nouveau chapitre disponible.',
            `/roman/${chapitre.romans?.slug}?ch=${chapitre.numero}`
          )
        )
      )
    }

    await admin.from('chapitres').update({ notifie: true }).eq('id', chapitre.id)
  }

  return NextResponse.json({ traites: chapitresAPublier.length })
}
