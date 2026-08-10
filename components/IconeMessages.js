'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function IconeMessages({ connecte }) {
  const [nonLus, setNonLus] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!connecte) return

    async function verifier() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count } = await supabase
        .from('dm_messages')
        .select('*, dm_conversations!inner(user_a, user_b)', { count: 'exact', head: true })
        .eq('lu', false)
        .neq('sender_id', user.id)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`, { foreignTable: 'dm_conversations' })

      setNonLus(count ?? 0)
    }
    verifier()
    const intervalle = setInterval(verifier, 30000)
    return () => clearInterval(intervalle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte])

  if (!connecte) return null

  return (
    <a href="/messages" aria-label="Messages" className="relative p-1.5 text-papier/70 hover:text-or transition-colors">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {nonLus > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-or text-encre text-[0.6rem] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {nonLus > 9 ? '9+' : nonLus}
        </span>
      )}
    </a>
  )
}
