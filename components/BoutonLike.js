'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BoutonLike({ chapitreId }) {
  const [compte, setCompte] = useState(0)
  const [aime, setAime] = useState(false)
  const [userId, setUserId] = useState(null)
  const supabase = createClient()

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('chapitre_id', chapitreId)
    setCompte(count ?? 0)

    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('user_id')
        .eq('chapitre_id', chapitreId)
        .eq('user_id', user.id)
        .maybeSingle()
      setAime(!!data)
    }
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapitreId])

  async function basculer() {
    if (!userId) {
      window.location.href = '/login'
      return
    }

    if (aime) {
      setAime(false)
      setCompte((c) => c - 1)
      await supabase.from('likes').delete().eq('chapitre_id', chapitreId).eq('user_id', userId)
    } else {
      setAime(true)
      setCompte((c) => c + 1)
      await supabase.from('likes').insert({ chapitre_id: chapitreId, user_id: userId })
    }
  }

  return (
    <button
      onClick={basculer}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
        aime ? 'border-or text-or bg-or/10' : 'border-ligne text-papier/50 hover:border-papier/30 hover:text-papier/80'
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={aime ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2.3 5 5.8 5c2 0 3.4 1 4.2 2.3C10.8 6 12.2 5 14.2 5c3.5 0 5.3 3.4 3.8 6.8C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
      <span className="font-mono">{compte}</span>
    </button>
  )
}
