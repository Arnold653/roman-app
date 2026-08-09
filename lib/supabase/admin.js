import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// À utiliser UNIQUEMENT côté serveur (routes API) — jamais côté navigateur.
// La clé service_role contourne les règles RLS.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
