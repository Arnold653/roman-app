import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Garde côté serveur pour TOUT ce qui vit sous /admin (les 4 pages : romans, livres,
// contes-africains, contes-enfants). Avant ce fichier, ces pages étaient des composants
// 'use client' sans aucune vérification en amont : n'importe qui pouvait charger l'interface
// admin dans son navigateur (aucune donnée réelle ne fuyait, chaque appel API étant déjà
// protégé par verifierAdmin(), mais l'interface elle-même était exposée). Un seul layout ici
// protège les 4 pages d'un coup.
export default async function AdminLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/login')
  }

  return children
}
