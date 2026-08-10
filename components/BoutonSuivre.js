'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BoutonSuivre({ profilId }) {
  const [suivi, setSuivi] = useState(false)
  const [userId, setUserId] = useState(null)
  const [pret, setPret] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      if (user) {
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('suivi_id', profilId)
          .maybeSingle()
        setSuivi(!!data)
      }
      setPret(true)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilId])

  async function basculer() {
    if (!userId) {
      window.location.href = '/login'
      return
    }

    if (suivi) {
      setSuivi(false)
      await fetch(`/api/follow?suivi_id=${profilId}`, { method: 'DELETE' })
    } else {
      setSuivi(true)
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suivi_id: profilId }),
      })
    }
  }

  if (!pret || userId === profilId) return null

  return (
    <button
      onClick={basculer}
      className={`text-sm font-medium rounded-full px-5 py-2 transition-colors ${
        suivi
          ? 'border border-ligne text-papier/60 hover:border-grenat hover:text-grenat'
          : 'bg-or text-encre hover:brightness-110'
      }`}
    >
      {suivi ? 'Suivi·e' : 'Suivre'}
    </button>
  )
}
