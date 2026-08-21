import { createAdminClient } from '@/lib/supabase/admin'

const BASE = 'https://app.encres.vercel.app'

export default async function sitemap() {
  const admin = createAdminClient()

  const [{ data: romans }, { data: livres }, { data: contesAfricains }, { data: contesEnfants }] = await Promise.all([
    admin.from('romans').select('slug, updated_at').eq('statut_visibilite', 'publie'),
    admin.from('livres').select('slug, updated_at').eq('statut', 'publie'),
    admin.from('contes_africains').select('slug, updated_at').eq('statut', 'publie'),
    admin.from('contes_enfants').select('slug, updated_at').eq('statut', 'publie'),
  ])

  const pagesStatiques = ['', '/romans', '/livres', '/contes-africains', '/contes-enfants', '/login'].map((chemin) => ({
    url: `${BASE}${chemin}`,
    changeFrequency: 'daily',
    priority: chemin === '' ? 1 : 0.7,
  }))

  const versEntrees = (items, prefixe) =>
    (items || []).map((item) => ({
      url: `${BASE}${prefixe}/${item.slug}`,
      lastModified: item.updated_at || undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }))

  return [
    ...pagesStatiques,
    ...versEntrees(romans, '/roman'),
    ...versEntrees(livres, '/livres'),
    ...versEntrees(contesAfricains, '/contes-africains'),
    ...versEntrees(contesEnfants, '/contes-enfants'),
  ]
}
