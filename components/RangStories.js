'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function Avatar({ pseudo, avatar_url, size = 'w-14 h-14' }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt={pseudo} className={`${size} rounded-full object-cover`} />
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center`}>
      <span className="font-display text-lg text-papier">{(pseudo || '?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

export default function RangStories() {
  const [groupes, setGroupes] = useState(null)
  const [moi, setMoi] = useState(null)
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const supabase = createClient()

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    setMoi(user)

    const { data: stories } = await supabase
      .from('stories')
      .select('id, contenu, created_at, user_id, profiles(pseudo, avatar_url)')
      .order('created_at', { ascending: false })

    const parUtilisateur = {}
    for (const s of stories ?? []) {
      if (!parUtilisateur[s.user_id]) parUtilisateur[s.user_id] = { profil: s.profiles, stories: [] }
      parUtilisateur[s.user_id].stories.push(s)
    }
    setGroupes(Object.values(parUtilisateur))
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function publier(e) {
    e.preventDefault()
    if (!texte.trim() || !moi) return
    setEnvoi(true)
    await supabase.from('stories').insert({ user_id: moi.id, contenu: texte.trim() })
    setTexte('')
    setEnvoi(false)
    setAjoutOuvert(false)
    charger()
  }

  const aDejaUneStory = groupes?.some((g) => g.stories[0]?.user_id === moi?.id)

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 mb-10 -mx-6 px-6 scrollbar-hide">
      {moi && (
        <button onClick={() => setAjoutOuvert(true)} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <Avatar pseudo="" avatar_url={null} />
            <span className="absolute -bottom-0.5 -right-0.5 bg-or text-encre rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-encre">+</span>
          </div>
          <span className="text-[0.65rem] text-papier/40 font-mono">
            {aDejaUneStory ? 'Ajouter' : 'Ta story'}
          </span>
        </button>
      )}

      {groupes?.filter((g) => g.stories[0]?.user_id !== moi?.id).map((g) => (
        <a key={g.stories[0].id} href={`/stories/${g.profil?.pseudo}`} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-or to-[#4fb3ff]">
            <div className="p-[2px] bg-encre rounded-full">
              <Avatar pseudo={g.profil?.pseudo} avatar_url={g.profil?.avatar_url} />
            </div>
          </div>
          <span className="text-[0.65rem] text-papier/50 font-mono truncate w-14 text-center">{g.profil?.pseudo}</span>
        </a>
      ))}

      {ajoutOuvert && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-6" onClick={() => setAjoutOuvert(false)}>
          <form
            onSubmit={publier}
            onClick={(e) => e.stopPropagation()}
            className="bg-encreClair border border-ligne rounded-lg p-5 w-full max-w-sm mb-24 sm:mb-0"
          >
            <p className="text-xs font-mono uppercase tracking-wide text-papier/40 mb-3">Nouvelle story — visible 24h</p>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ce que tu es en train de lire, une impression..."
              className="w-full bg-encre border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors"
            />
            <button type="submit" disabled={envoi || !texte.trim()} className="w-full bg-or text-encre font-medium rounded-lg px-3 py-2.5 mt-3 disabled:opacity-40">
              Publier
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
