import { createClient } from '@/lib/supabase/server'
import BoutonSuivre from '@/components/BoutonSuivre'

function AvatarMonogramme({ pseudo, avatar_url }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt={pseudo} className="w-12 h-12 rounded-full object-cover shrink-0" />
  }
  const initiale = (pseudo || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
      <span className="font-display text-lg text-papier">{initiale}</span>
    </div>
  )
}

export default async function LecteursPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profils } = await supabase
    .from('profiles')
    .select('id, pseudo, avatar_url, bio, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const autres = (profils ?? []).filter((p) => p.id !== user?.id)

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-3">Découvrir</h1>
      <p className="text-papier/50 mb-12 leading-relaxed">
        D'autres lecteurs à suivre pour retrouver leurs réactions dans ton fil.
      </p>

      <div className="filet-or mb-8" />

      <ul className="divide-y divide-ligne">
        {autres.map((p) => (
          <li key={p.id} className="py-5 flex items-center justify-between gap-4">
            <a href={`/profil/${p.pseudo}`} className="flex items-center gap-4 min-w-0">
              <AvatarMonogramme pseudo={p.pseudo} avatar_url={p.avatar_url} />
              <div className="min-w-0">
                <p className="text-papier font-display text-lg truncate">{p.pseudo}</p>
                {p.bio && <p className="text-papier/40 text-sm truncate">{p.bio}</p>}
              </div>
            </a>
            <div className="shrink-0">
              <BoutonSuivre profilId={p.id} />
            </div>
          </li>
        ))}
        {autres.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-6">Personne d'autre pour l'instant — sois le premier à inviter des lecteurs.</p>
        )}
      </ul>
    </div>
  )
}
