import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let configure = false
function assurerConfiguration() {
  if (configure) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@encre.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  configure = true
}

// Envoie une notification push à tous les appareils abonnés d'un utilisateur.
// N'échoue jamais bruyamment : une erreur d'envoi (abonnement expiré, etc.) est simplement ignorée.
export async function envoyerPush(userId, titre, corps, lien) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  assurerConfiguration()

  const admin = createAdminClient()
  const { data: abonnements } = await admin.from('push_subscriptions').select('*').eq('user_id', userId)
  if (!abonnements || abonnements.length === 0) return

  const charge = JSON.stringify({ titre, corps, lien })

  await Promise.all(
    abonnements.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          charge
        )
      } catch (err) {
        // Abonnement invalide/expiré : on le retire silencieusement
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', a.id)
        }
      }
    })
  )
}
